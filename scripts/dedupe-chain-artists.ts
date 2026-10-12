// dedupe-chain-artists.ts
// The Oct 4 import matched artists to shops by website domain, so a chain's
// roster was copied onto every location (Atomic Tattoos: 13 artists x 29
// shops). This keeps one copy of each artist and hides the rest
// (is_active=false). Never deletes, never touches shops.
//
// Detection (active artists only):
//   key      lower(trim(display_name)) + ":" + styles joined with "+" (stored order)
//   link     two shops share 3 or more keys
//   cluster  shops connected by links (transitively)
//   group    a key with more than one active row inside a cluster, plus
//            duplicates at one shop outside clusters: the same name at the same
//            shop_id, whatever their styles (one copy often has the shop's
//            short style list and the other Tattoodo's long one)
// Keeper per group: the claimed row (is_claimed or user_id; two or more
// claimed rows skips the group). Otherwise, in a cluster, the row at the
// cluster's home shop (most reviews, then has a cover or logo, then oldest,
// then id), else the row whose shop has the most reviews (then oldest, then
// id); at a single shop, the row with the most styles (then oldest, then id). A group is skipped
// when any row it would hide is referenced elsewhere (portfolio_images,
// booking_requests, flash_listings, reviews, claim_requests, claim_links,
// saved_items). Empty avatar_url, instagram_handle, bio, website_url or
// booking_url on the keeper are filled from a hidden copy.
//
// Run: npx tsx scripts/dedupe-chain-artists.ts [--apply]
//   Dry run by default: writes data/reports/dedupe-chain-artists-dryrun.csv.
//   --apply recomputes, refuses unless the hides match that CSV exactly, then
//   writes in batches of 500, undo-logged to
//   data/undo/dedupe-chain-artists-<timestamp>.jsonl.
//   Undo: npx tsx scripts/undo-dedupe-chain-artists.ts --input <log> [--apply]

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog } from "./lib/undo-log"
import { fetchAll, fetchIn, modeBanner, parseCSV, writeCsv } from "./lib/cleanup-utils"
import { withRetry } from "./lib/retry"

const ARGS = parseScriptArgs()
const SCRIPT = "dedupe-chain-artists"
const REPORT = "data/reports/dedupe-chain-artists-dryrun.csv"
const MIN_SHARED_KEYS = 3
const BATCH = 500
const FILL_FIELDS = ["avatar_url", "instagram_handle", "bio", "website_url", "booking_url"] as const

type Row = Record<string, unknown>

interface Artist {
  id: string
  name: string
  key: string
  styles: string[]
  shopId: string
  claimed: boolean
  createdAt: string
  row: Row
}

interface Shop {
  id: string
  name: string
  city: string
  state: string
  reviews: number | null
  hasImage: boolean
  createdAt: string
}

interface Group {
  clusterId: string
  key: string
  rows: Artist[]
}

interface Plan {
  clusterId: string
  keeper: Artist
  hides: Artist[]
  fills: Partial<Record<(typeof FILL_FIELDS)[number], unknown>>
}

const blank = (v: unknown) => v == null || String(v).trim() === ""
const str = (v: unknown) => (v == null ? "" : String(v))

/** Most reviews (nulls last), then has a cover or logo, then oldest, then id. */
function compareShopsForHome(a: Shop, b: Shop): number {
  const ra = a.reviews ?? -1
  const rb = b.reviews ?? -1
  if (ra !== rb) return rb - ra
  if (a.hasImage !== b.hasImage) return a.hasImage ? -1 : 1
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
  return a.id < b.id ? -1 : 1
}

/** Oldest, then id. */
function compareArtistsByAge(a: Artist, b: Artist): number {
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

/** Every table that can point at an artist id, and the ids each one uses. */
async function referencedArtistIds(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<Map<string, Set<string>>> {
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
  // shop_artists.artist_profile_id has no foreign key; reported, not a reason to skip.
  const roster = await withRetry("fetch shop_artists", () =>
    fetchAll(supabase, "shop_artists", "id, artist_profile_id", (q) => q.not("artist_profile_id", "is", null)),
  )
  add("shop_artists (report only)", roster.map((r) => r.artist_profile_id))
  return refs
}

async function detect(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const raw = await withRetry("fetch artists", () =>
    fetchAll(
      supabase,
      "artists",
      `id, display_name, styles, shop_id, is_claimed, user_id, created_at, ${FILL_FIELDS.join(", ")}`,
      (q) => q.eq("is_active", true),
    ),
  )
  const artists: Artist[] = raw
    .filter((r) => r.shop_id)
    .map((r) => {
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
    })

  const shopIds = Array.from(new Set(artists.map((a) => a.shopId)))
  const shopRows = await withRetry("fetch shops", () =>
    fetchIn(supabase, "shops", "id, name, city, state, review_count, cover_image_url, logo_url, created_at", "id", shopIds),
  )
  const shops = new Map<string, Shop>(
    shopRows.map((s) => [
      String(s.id),
      {
        id: String(s.id),
        name: str(s.name),
        city: str(s.city),
        state: str(s.state),
        reviews: s.review_count == null ? null : Number(s.review_count),
        hasImage: !blank(s.cover_image_url) || !blank(s.logo_url),
        createdAt: str(s.created_at),
      },
    ]),
  )

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

  // Duplicate groups: per cluster and key; outside clusters, per shop and key.
  const byGroup = new Map<string, Group>()
  for (const a of artists) {
    const cluster = clusterOf.get(a.shopId)
    const groupKey = cluster ? `c:${cluster}:${a.key}` : `s:${a.shopId}:${a.name.trim().toLowerCase()}`
    const g = byGroup.get(groupKey) ?? { clusterId: cluster ?? `shop:${a.shopId}`, key: a.key, rows: [] }
    g.rows.push(a)
    byGroup.set(groupKey, g)
  }
  const groups = Array.from(byGroup.values()).filter((g) => g.rows.length > 1)
  // Same-shop duplicates (same key) anywhere, for the report.
  const sameShop = new Map<string, number>()
  for (const a of artists) sameShop.set(`${a.shopId}:${a.key}`, (sameShop.get(`${a.shopId}:${a.key}`) ?? 0) + 1)
  const sameShopExtra = Array.from(sameShop.values()).reduce((n, c) => n + Math.max(0, c - 1), 0)

  return { artists, shops, clusters, homeShop, groups, sameShopExtra }
}

function plan(
  detected: Awaited<ReturnType<typeof detect>>,
  refs: Map<string, Set<string>>,
): { plans: Plan[]; skipped: { group: Group; reason: string }[] } {
  const { shops, homeShop, groups } = detected
  const plans: Plan[] = []
  const skipped: { group: Group; reason: string }[] = []

  for (const group of groups) {
    const claimed = group.rows.filter((r) => r.claimed)
    if (claimed.length > 1) {
      skipped.push({ group, reason: `${claimed.length} claimed rows` })
      continue
    }
    let keeper: Artist
    if (claimed.length === 1) keeper = claimed[0]
    else if (group.clusterId.startsWith("shop:")) {
      keeper = [...group.rows].sort((a, b) => b.styles.length - a.styles.length || compareArtistsByAge(a, b))[0]
    } else {
      const home = homeShop.get(group.clusterId)
      const atHome = home ? group.rows.filter((r) => r.shopId === home.id).sort(compareArtistsByAge) : []
      keeper =
        atHome[0] ??
        [...group.rows].sort((a, b) => {
          const ra = shops.get(a.shopId)?.reviews ?? -1
          const rb = shops.get(b.shopId)?.reviews ?? -1
          return ra !== rb ? rb - ra : compareArtistsByAge(a, b)
        })[0]
    }
    const hides = group.rows.filter((r) => r.id !== keeper.id).sort((a, b) => (a.id < b.id ? -1 : 1))

    const referencedBy = Array.from(refs.entries())
      .filter(([table]) => !table.includes("report only"))
      .flatMap(([table, ids]) => (hides.some((h) => ids.has(h.id)) ? [table] : []))
    if (referencedBy.length > 0) {
      skipped.push({ group, reason: `a copy is referenced by ${referencedBy.join(", ")}` })
      continue
    }

    const fills: Plan["fills"] = {}
    for (const field of FILL_FIELDS) {
      if (!blank(keeper.row[field])) continue
      const donor = hides.find((h) => !blank(h.row[field]))
      if (donor) fills[field] = donor.row[field]
    }
    plans.push({ clusterId: group.clusterId, keeper, hides, fills })
  }
  return { plans, skipped }
}

/** Small seeded PRNG so the "10 random clusters" sample is the same every run. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

async function main() {
  modeBanner(ARGS.apply)
  const supabase = getSupabaseAdmin()
  const detected = await detect(supabase)
  const refs = await referencedArtistIds(supabase)
  const { plans, skipped } = plan(detected, refs)
  const { shops, clusters, homeShop, groups, sameShopExtra, artists } = detected

  const shopLabel = (id: string) => {
    const s = shops.get(id)
    return s ? `${s.name} (${s.city}, ${s.state})` : id
  }
  const hides = plans.flatMap((p) => p.hides.map((h) => ({ h, p })))
  const fillCount = plans.reduce((n, p) => n + Object.keys(p.fills).length, 0)
  const clusterGroups = groups.filter((g) => !g.clusterId.startsWith("shop:"))
  const shopGroups = groups.filter((g) => g.clusterId.startsWith("shop:"))
  const shopsInClusters = Array.from(clusters.values()).reduce((n, ids) => n + ids.length, 0)

  console.log(`Active artists (with a shop): ${artists.length}`)
  console.log(`Clusters:                     ${clusters.size}`)
  console.log(`Shops in clusters:            ${shopsInClusters}`)
  console.log(`Duplicate groups:             ${groups.length} (${clusterGroups.length} in clusters, ${shopGroups.length} same-shop outside clusters)`)
  console.log(`Same-shop extra rows (all):   ${sameShopExtra}`)
  console.log(`Rows to hide:                 ${hides.length} (${hides.filter(({ p }) => p.clusterId.startsWith("shop:")).length} from same-shop groups outside clusters)`)
  console.log(`Fields to fill on keepers:    ${fillCount}`)
  for (const field of FILL_FIELDS) {
    const n = plans.filter((p) => field in p.fills).length
    if (n) console.log(`  ${field}: ${n}`)
  }
  console.log(`Skipped groups:               ${skipped.length}`)
  for (const { group, reason } of skipped) {
    console.log(`  ${group.rows[0].name} [${group.rows[0].styles.join("+")}] x${group.rows.length}: ${reason}`)
  }
  const reportOnly = refs.get("shop_artists (report only)")
  const rosterHits = hides.filter(({ h }) => reportOnly?.has(h.id)).length
  console.log(`Hidden rows linked from shop_artists.artist_profile_id (not a skip reason): ${rosterHits}`)

  // The Atomic Tattoos cluster in full.
  const atomic = Array.from(clusters.entries())
    .filter(([, ids]) => ids.some((id) => /atomic tattoos/i.test(shops.get(id)?.name ?? "")))
    .sort((a, b) => b[1].length - a[1].length)[0]
  if (atomic) {
    const [root, ids] = atomic
    const atomicPlans = plans.filter((p) => p.clusterId === root)
    console.log(`\nAtomic Tattoos cluster: ${ids.length} shops, home ${shopLabel(homeShop.get(root)!.id)}`)
    console.log(`  ${atomicPlans.length} keepers, ${atomicPlans.reduce((n, p) => n + p.hides.length, 0)} hides`)
    for (const p of atomicPlans.sort((a, b) => a.keeper.name.localeCompare(b.keeper.name))) {
      console.log(`  keep ${p.keeper.name} [${p.keeper.styles.join("+")}] at ${shopLabel(p.keeper.shopId)}; hide ${p.hides.length}`)
    }
  }

  // 10 other clusters, the same sample every run.
  const rand = seeded(20261012)
  const others = Array.from(clusters.keys()).filter((root) => root !== atomic?.[0])
  const sample: string[] = []
  while (sample.length < Math.min(10, others.length)) {
    const pick = others[Math.floor(rand() * others.length)]
    if (!sample.includes(pick)) sample.push(pick)
  }
  console.log("\n10 random other clusters:")
  for (const root of sample) {
    const ps = plans.filter((p) => p.clusterId === root)
    console.log(
      `  ${clusters.get(root)!.length} shops, home ${shopLabel(homeShop.get(root)!.id)}: ${ps.length} keepers, ${ps.reduce((n, p) => n + p.hides.length, 0)} hides`,
    )
  }

  const rows = hides.map(({ h, p }) => {
    const s = shops.get(h.shopId)
    const k = shops.get(p.keeper.shopId)
    return {
      artist_id: h.id,
      name: h.name,
      styles: h.styles.join("+"),
      shop_name: s?.name ?? "",
      shop_city: s?.city ?? "",
      shop_state: s?.state ?? "",
      keeper_id: p.keeper.id,
      keeper_shop_name: k?.name ?? "",
      keeper_shop_city: k?.city ?? "",
      keeper_shop_state: k?.state ?? "",
      cluster_id: p.clusterId,
    }
  })
  const headers = ["artist_id", "name", "styles", "shop_name", "shop_city", "shop_state", "keeper_id", "keeper_shop_name", "keeper_shop_city", "keeper_shop_state", "cluster_id"]

  if (!ARGS.apply) {
    fs.mkdirSync("data/reports", { recursive: true })
    writeCsv(REPORT, headers, rows)
    console.log(`\nWrote ${REPORT} (${rows.length} rows). Dry run: nothing written to the database. Pass --apply to write.`)
    return
  }

  // --apply: the hides must match the dry run exactly.
  if (!fs.existsSync(REPORT)) throw new Error(`Run the dry run first (${REPORT} is missing).`)
  const planned = new Set(parseCSV(fs.readFileSync(REPORT, "utf-8")).map((r) => r.artist_id))
  const now = new Set(rows.map((r) => r.artist_id))
  const missing = Array.from(planned).filter((id) => !now.has(id))
  const extra = Array.from(now).filter((id) => !planned.has(id))
  if (missing.length || extra.length) {
    console.error(`\nSTOP: hides differ from the dry run (${missing.length} no longer planned, ${extra.length} new). Nothing written.`)
    process.exit(1)
  }

  const undo = new UndoLog(SCRIPT)
  const ids = hides.map(({ h }) => h.id)
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH)
    undo.append(batch.map((id) => ({ table: "artists", id, field: "is_active", old_value: true, new_value: false })))
    await withRetry(`hide batch ${i / BATCH + 1}`, async () => {
      const { error } = await supabase.from("artists").update({ is_active: false }).in("id", batch).eq("is_active", true)
      if (error) throw new Error(error.message)
    })
    console.log(`  hid ${Math.min(i + BATCH, ids.length)} / ${ids.length}`)
  }

  const fillPlans = plans.filter((p) => Object.keys(p.fills).length > 0)
  for (const p of fillPlans) {
    undo.append(
      Object.entries(p.fills).map(([field, value]) => ({
        table: "artists",
        id: p.keeper.id,
        field,
        old_value: p.keeper.row[field] ?? null,
        new_value: value,
      })),
    )
    await withRetry(`fill ${p.keeper.id}`, async () => {
      const { error } = await supabase.from("artists").update(p.fills).eq("id", p.keeper.id)
      if (error) throw new Error(error.message)
    })
  }
  console.log(`\nHid ${ids.length} artists and filled ${fillCount} fields on ${fillPlans.length} keepers.`)
  console.log(`Undo log: ${undo.file} (${undo.entries} entries)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
