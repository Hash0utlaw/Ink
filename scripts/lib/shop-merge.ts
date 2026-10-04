// scripts/lib/shop-merge.ts
// Keeper / field-fill / artist logic for merging duplicate shops. Shared by
// merge-duplicate-shops.ts (automatic clusters) and apply-review-decisions.ts
// (pairs a human marked "merge") so both merge in exactly the same way.
// Planning is pure — it returns the row updates; callers decide whether to
// apply them (through loggedUpdate, so every write is undo-logged).

import type { SupabaseClient } from "@supabase/supabase-js"
import { coords, countFilled, fetchIn, haversineMeters, isEmptyValue, normalizeName } from "./cleanup-utils"

export type Row = Record<string, unknown>

export interface Write {
  table: string
  id: string
  oldRow: Row
  patch: Row
}

export interface MergeResult {
  keeper: Row
  dupes: Row[]
  maxDistanceM: number
  fieldsFilled: string[]
  shopArtistsMoved: number
  shopArtistsLeft: number
  artistsMoved: number
  artistsMerged: number
  childRowsRepointed: number
  protectedArtists: string[]
  writes: Write[]
}

// Never copied from a duplicate into the keeper.
const SHOP_NO_COPY = new Set(["id", "slug", "place_id", "owner_user_id", "created_at", "is_active", "updated_at"])
const ARTIST_NO_COPY = new Set([
  "id", "user_id", "shop_id", "handle", "created_at", "updated_at", "is_active", "is_claimed", "source",
])
// Tables whose artist_id is re-pointed when a duplicate artist is merged.
const ARTIST_CHILD_TABLES = ["portfolio_images", "flash_listings", "reviews", "booking_requests"] as const

export function rowId(r: Row): string {
  return String(r.id)
}

// The shop with a Google place_id (ChIJ…) wins; otherwise, and as a
// tie-break, the one with the most non-null fields, then the oldest.
export function pickKeeper(shops: Row[]): Row {
  const google = shops.filter((s) => String(s.place_id ?? "").startsWith("ChIJ"))
  const pool = google.length > 0 ? google : shops
  return [...pool].sort(
    (a, b) => countFilled(b) - countFilled(a) || String(a.created_at).localeCompare(String(b.created_at))
  )[0]
}

// Fields on `target` that are empty and non-empty on one of `sources`
// (first source with a value wins). Never overwrites a non-null value.
function fillPatch(target: Row, sources: Row[], skip: Set<string>): Row {
  const patch: Row = {}
  for (const field of Object.keys(target)) {
    if (skip.has(field) || !isEmptyValue(target[field])) continue
    const src = sources.find((s) => !isEmptyValue(s[field]))
    if (src) patch[field] = src[field]
  }
  return patch
}

function groupBy(rows: Row[], key: string): Map<string, Row[]> {
  const out = new Map<string, Row[]>()
  for (const r of rows) {
    const k = String(r[key])
    if (!out.has(k)) out.set(k, [])
    out.get(k)!.push(r)
  }
  return out
}

// Related rows needed to plan merges of the given shops.
export interface MergeContext {
  shopArtistsByShop: Map<string, Row[]>
  artistsByShop: Map<string, Row[]>
  childRows: Map<string, Row[]> // `${table}|${artist_id}` → rows
}

export async function loadMergeContext(supabase: SupabaseClient, shopIds: string[]): Promise<MergeContext> {
  const shopArtists = await fetchIn(supabase, "shop_artists", "*", "shop_id", shopIds)
  const artists = await fetchIn(supabase, "artists", "*", "shop_id", shopIds)
  const childRows = new Map<string, Row[]>()
  const artistIds = artists.map(rowId)
  for (const table of ARTIST_CHILD_TABLES) {
    const rows = await fetchIn(supabase, table, "id, artist_id", "artist_id", artistIds)
    for (const r of rows) {
      const k = `${table}|${r.artist_id}`
      if (!childRows.has(k)) childRows.set(k, [])
      childRows.get(k)!.push(r)
    }
  }
  return {
    shopArtistsByShop: groupBy(shopArtists, "shop_id"),
    artistsByShop: groupBy(artists, "shop_id"),
    childRows,
  }
}

// Plans merging `dupes` into `keeper`. Mutates ctx so that later merges in
// the same run see artists/stubs this one moved onto the keeper.
export function planMerge(keeper: Row, dupes: Row[], ctx: MergeContext): MergeResult {
  const writes: Write[] = []
  const keeperId = rowId(keeper)
  const ordered = [...dupes].sort((a, b) => countFilled(b) - countFilled(a))

  let maxDistanceM = 0
  const kc = coords(keeper)
  for (const d of ordered) {
    const dc = coords(d)
    if (kc && dc) maxDistanceM = Math.max(maxDistanceM, haversineMeters(kc[0], kc[1], dc[0], dc[1]))
  }

  const result: MergeResult = {
    keeper,
    dupes: ordered,
    maxDistanceM,
    fieldsFilled: [],
    shopArtistsMoved: 0,
    shopArtistsLeft: 0,
    artistsMoved: 0,
    artistsMerged: 0,
    childRowsRepointed: 0,
    protectedArtists: [],
    writes,
  }

  // Shop fields
  const shopPatch = fillPatch(keeper, ordered, SHOP_NO_COPY)
  if (Object.keys(shopPatch).length > 0) {
    writes.push({ table: "shops", id: keeperId, oldRow: { ...keeper }, patch: shopPatch })
    result.fieldsFilled = Object.keys(shopPatch)
  }

  // shop_artists: move only when the keeper has no row with that name yet.
  const keeperStubs = ctx.shopArtistsByShop.get(keeperId) ?? []
  ctx.shopArtistsByShop.set(keeperId, keeperStubs)
  const keeperStubNames = new Set(keeperStubs.map((r) => normalizeName(r.name)))
  for (const d of ordered) {
    for (const r of ctx.shopArtistsByShop.get(rowId(d)) ?? []) {
      const n = normalizeName(r.name)
      if (keeperStubNames.has(n)) {
        result.shopArtistsLeft++
        continue
      }
      keeperStubNames.add(n)
      writes.push({ table: "shop_artists", id: rowId(r), oldRow: { ...r }, patch: { shop_id: keeperId } })
      keeperStubs.push({ ...r, shop_id: keeperId })
      result.shopArtistsMoved++
    }
  }

  // artists
  const keeperArtistRows = ctx.artistsByShop.get(keeperId) ?? []
  ctx.artistsByShop.set(keeperId, keeperArtistRows)
  const keeperArtists = new Map<string, Row>() // normalized name → active keeper-side artist
  for (const a of keeperArtistRows) {
    if (a.is_active) keeperArtists.set(normalizeName(a.display_name), a)
  }
  for (const d of ordered) {
    for (const a of ctx.artistsByShop.get(rowId(d)) ?? []) {
      if (!a.is_active) continue
      const n = normalizeName(a.display_name)
      const target = keeperArtists.get(n)
      if (!target) {
        writes.push({ table: "artists", id: rowId(a), oldRow: { ...a }, patch: { shop_id: keeperId } })
        keeperArtists.set(n, a)
        keeperArtistRows.push(a)
        result.artistsMoved++
        continue
      }
      if (a.user_id || a.is_claimed) {
        result.protectedArtists.push(`${a.display_name} (${rowId(a)})`)
        continue
      }
      const artistPatch = fillPatch(target, [a], ARTIST_NO_COPY)
      if (Object.keys(artistPatch).length > 0) {
        writes.push({ table: "artists", id: rowId(target), oldRow: { ...target }, patch: artistPatch })
        Object.assign(target, artistPatch) // later dupes see the filled value
      }
      for (const table of ARTIST_CHILD_TABLES) {
        for (const child of ctx.childRows.get(`${table}|${rowId(a)}`) ?? []) {
          writes.push({ table, id: rowId(child), oldRow: { ...child }, patch: { artist_id: rowId(target) } })
          result.childRowsRepointed++
        }
      }
      writes.push({ table: "artists", id: rowId(a), oldRow: { ...a }, patch: { is_active: false } })
      a.is_active = false
      result.artistsMerged++
    }
  }

  for (const d of ordered) writes.push({ table: "shops", id: rowId(d), oldRow: { ...d }, patch: { is_active: false } })
  return result
}
