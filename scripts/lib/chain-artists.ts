// scripts/lib/chain-artists.ts
// Shared by dedupe-chain-artists.ts and rehome-chain-artists.ts: the artist
// key, shop clusters (shops sharing 3+ keys, connected transitively), the
// cluster's home shop and the duplicate groups inside each cluster.

import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchAll } from "./cleanup-utils"
import { withRetry } from "./retry"

export const MIN_SHARED_KEYS = 3
export const FILL_FIELDS = ["avatar_url", "instagram_handle", "bio", "website_url", "booking_url"] as const
export type FillField = (typeof FILL_FIELDS)[number]

export type Row = Record<string, unknown>

export interface Artist {
  id: string
  name: string
  key: string
  styles: string[]
  shopId: string
  claimed: boolean
  createdAt: string
  row: Row
}

export interface Shop {
  id: string
  name: string
  city: string
  state: string
  reviews: number | null
  hasImage: boolean
  createdAt: string
  lat: number | null
  lng: number | null
  isActive: boolean
  possiblyClosed: boolean
}

export interface Group {
  clusterId: string
  key: string
  rows: Artist[]
}

export const ARTIST_COLUMNS = `id, display_name, styles, shop_id, is_claimed, user_id, created_at, is_active, ${FILL_FIELDS.join(", ")}`
export const SHOP_COLUMNS = "id, name, city, state, review_count, cover_image_url, logo_url, created_at, latitude, longitude, is_active, possibly_closed"

export const blank = (v: unknown) => v == null || String(v).trim() === ""
export const str = (v: unknown) => (v == null ? "" : String(v))

export function toArtist(r: Row): Artist {
  const styles = Array.isArray(r.styles) ? (r.styles as string[]) : []
  return {
    id: String(r.id),
    name: str(r.display_name),
    key: `${str(r.display_name).trim().toLowerCase()}:${styles.join("+")}`,
    styles,
    shopId: String(r.shop_id),
    claimed: r.is_claimed === true || r.user_id != null,
    createdAt: str(r.created_at),
    row: r,
  }
}

export function toShop(s: Row): Shop {
  const lat = s.latitude == null ? null : Number(s.latitude)
  const lng = s.longitude == null ? null : Number(s.longitude)
  return {
    id: String(s.id),
    name: str(s.name),
    city: str(s.city),
    state: str(s.state),
    reviews: s.review_count == null ? null : Number(s.review_count),
    hasImage: !blank(s.cover_image_url) || !blank(s.logo_url),
    createdAt: str(s.created_at),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    isActive: s.is_active === true,
    possiblyClosed: s.possibly_closed === true,
  }
}

/** Most reviews (nulls last), then has a cover or logo, then oldest, then id. */
export function compareShopsForHome(a: Shop, b: Shop): number {
  const ra = a.reviews ?? -1
  const rb = b.reviews ?? -1
  if (ra !== rb) return rb - ra
  if (a.hasImage !== b.hasImage) return a.hasImage ? -1 : 1
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
  return a.id < b.id ? -1 : 1
}

/** Oldest, then id. */
export function compareArtistsByAge(a: Artist, b: Artist): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
  return a.id < b.id ? -1 : 1
}

class UnionFind {
  private parent = new Map<string, string>()
  find(x: string): string {
    let p = this.parent.get(x) ?? x
    if (p !== x) {
      p = this.find(p)
      this.parent.set(x, p)
    }
    return p
  }
  union(a: string, b: string) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb)
  }
}

/**
 * Clusters and duplicate groups for a set of artists (all treated as active).
 * Group ids: the cluster's root shop id, or "shop:<id>" for same-name
 * duplicates at one shop outside any cluster.
 */
export function buildGroups(artists: Artist[], shops: Map<string, Shop>) {
  const shopIds = Array.from(new Set(artists.map((a) => a.shopId)))

  // Shops per key, then pairs of shops sharing 3+ keys.
  const shopsByKey = new Map<string, Set<string>>()
  for (const a of artists) {
    const set = shopsByKey.get(a.key) ?? new Set<string>()
    set.add(a.shopId)
    shopsByKey.set(a.key, set)
  }
  const shared = new Map<string, number>()
  for (const set of shopsByKey.values()) {
    if (set.size < 2) continue
    const list = Array.from(set).sort()
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const pair = `${list[i]}|${list[j]}`
        shared.set(pair, (shared.get(pair) ?? 0) + 1)
      }
  }
  const uf = new UnionFind()
  for (const [pair, n] of shared) {
    if (n < MIN_SHARED_KEYS) continue
    const [a, b] = pair.split("|")
    uf.union(a, b)
  }

  // Clusters: connected shops (2 or more).
  const members = new Map<string, string[]>()
  for (const id of shopIds) {
    const root = uf.find(id)
    members.set(root, [...(members.get(root) ?? []), id])
  }
  const clusters = new Map<string, string[]>()
  for (const [root, ids] of members) if (ids.length > 1) clusters.set(root, ids)
  const clusterOf = new Map<string, string>()
  for (const [root, ids] of clusters) for (const id of ids) clusterOf.set(id, root)
  const homeShop = new Map<string, Shop>()
  for (const [root, ids] of clusters) {
    homeShop.set(root, ids.map((id) => shops.get(id)!).filter(Boolean).sort(compareShopsForHome)[0])
  }

  // Duplicate groups: per cluster and key; outside clusters, per shop and name
  // (whatever the styles: one copy often has the shop's short style list and
  // the other Tattoodo's long one).
  const byGroup = new Map<string, Group>()
  for (const a of artists) {
    const cluster = clusterOf.get(a.shopId)
    const groupKey = cluster ? `c:${cluster}:${a.key}` : `s:${a.shopId}:${a.name.trim().toLowerCase()}`
    const g = byGroup.get(groupKey) ?? { clusterId: cluster ?? `shop:${a.shopId}`, key: a.key, rows: [] }
    g.rows.push(a)
    byGroup.set(groupKey, g)
  }
  const groups = Array.from(byGroup.values()).filter((g) => g.rows.length > 1)

  return { clusters, clusterOf, homeShop, groups }
}

/** Miles between two points (same formula as the finder's database function). */
export function milesBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * Artist ids each table points at. A row referenced here is never hidden.
 * shop_artists.artist_profile_id has no foreign key and is reported only.
 */
export async function referencedArtistIds(supabase: SupabaseClient): Promise<Map<string, Set<string>>> {
  const refs = new Map<string, Set<string>>()
  const add = (table: string, ids: unknown[]) => {
    const set = refs.get(table) ?? new Set<string>()
    for (const id of ids) if (id) set.add(String(id))
    refs.set(table, set)
  }
  for (const table of ["portfolio_images", "booking_requests", "flash_listings", "reviews", "claim_requests", "claim_links"]) {
    const rows = await withRetry(`fetch ${table}`, () => fetchAll(supabase, table, "id, artist_id"))
    add(table, rows.map((r) => r.artist_id))
  }
  const saved = await withRetry("fetch saved_items", () =>
    fetchAll(supabase, "saved_items", "id, item_id, item_type", (q) => q.eq("item_type", "artist")),
  )
  add("saved_items", saved.map((r) => r.item_id))
  const roster = await withRetry("fetch shop_artists", () =>
    fetchAll(supabase, "shop_artists", "id, artist_profile_id", (q) => q.not("artist_profile_id", "is", null)),
  )
  add("shop_artists (report only)", roster.map((r) => r.artist_profile_id))
  return refs
}

/** The tables (other than report-only ones) that reference any of these ids. */
export function referencingTables(refs: Map<string, Set<string>>, ids: string[]): string[] {
  return Array.from(refs.entries())
    .filter(([table]) => !table.includes("report only"))
    .flatMap(([table, set]) => (ids.some((id) => set.has(id)) ? [table] : []))
}
