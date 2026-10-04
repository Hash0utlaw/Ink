// merge-duplicate-shops.ts
// Finds active shops that are the same business imported more than once
// (same normalized name, within 150m) and merges each cluster into one keeper.
// Never deletes rows — duplicates are set is_active=false.
// Run: npx tsx scripts/merge-duplicate-shops.ts [--apply]
//   Dry-run by default. Writes data/merge-plan.csv and data/merge-review.csv
//   either way; --apply also performs the merge (undo-logged).
//
// Clusters are found with union-find, but a member is only merged if it is
// itself within 150m of the keeper (not just chained through another member)
// and its phone doesn't conflict with the keeper's. Members excluded by
// either rule stay active and go to merge-review.csv for a human decision.

import { config } from "dotenv"
config({ path: ".env.local" })

import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog, loggedUpdate } from "./lib/undo-log"
import {
  GridIndex,
  UnionFind,
  coords,
  fetchAll,
  fetchIn,
  haversineMeters,
  modeBanner,
  normalizeName,
  normalizePhone,
  similarity,
  writeCsv,
} from "./lib/cleanup-utils"
import { loadMergeContext, pickKeeper, planMerge, rowId as id, type MergeResult, type Row, type Write } from "./lib/shop-merge"

const ARGS = parseScriptArgs()
const CLUSTER_RADIUS_M = 150
const REVIEW_NAME_RADIUS_M = 75
const REVIEW_NAME_SIMILARITY = 0.85
const REVIEW_PHONE_RADIUS_M = 300

const REASON_DISTANCE = "distance to keeper > 150m"
const REASON_PHONE = "phone conflict"

const REVIEW_HEADERS = [
  "reason", "distance_m", "name_similarity", "shop_a_id", "shop_a_name", "shop_a_place_id", "shop_a_phone",
  "shop_a_address", "shop_b_id", "shop_b_name", "shop_b_place_id", "shop_b_phone", "shop_b_address", "city", "state",
]

function reviewRow(reason: string, a: Row, b: Row): Row {
  const [lat1, lng1] = coords(a)!
  const [lat2, lng2] = coords(b)!
  return {
    reason,
    distance_m: Math.round(haversineMeters(lat1, lng1, lat2, lng2)),
    name_similarity: similarity(normalizeName(a.name), normalizeName(b.name)).toFixed(3),
    shop_a_id: id(a),
    shop_a_name: a.name,
    shop_a_place_id: a.place_id,
    shop_a_phone: a.phone,
    shop_a_address: a.address,
    shop_b_id: id(b),
    shop_b_name: b.name,
    shop_b_place_id: b.place_id,
    shop_b_phone: b.phone,
    shop_b_address: b.address,
    city: a.city,
    state: a.state,
  }
}

async function main() {
  modeBanner(ARGS.apply)
  const supabase = getSupabaseAdmin()

  console.log("Loading active shops…")
  const shops = await fetchAll(supabase, "shops", "*", (q) => q.eq("is_active", true))
  console.log(`  ${shops.length} active shops`)

  const located = shops.filter((s) => coords(s))
  console.log(`  ${located.length} with coordinates (others can't be distance-matched)\n`)

  // ── Candidate clusters: same normalized name within 150m, union-find ────────
  const byName = new Map<string, Row[]>()
  for (const s of located) {
    const n = normalizeName(s.name)
    if (!n) continue
    if (!byName.has(n)) byName.set(n, [])
    byName.get(n)!.push(s)
  }

  const uf = new UnionFind()
  for (const group of Array.from(byName.values())) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i++) {
      const [lat1, lng1] = coords(group[i])!
      for (let j = i + 1; j < group.length; j++) {
        const [lat2, lng2] = coords(group[j])!
        if (haversineMeters(lat1, lng1, lat2, lng2) <= CLUSTER_RADIUS_M) uf.union(id(group[i]), id(group[j]))
      }
    }
  }

  const clusterMap = new Map<string, Row[]>()
  for (const s of located) {
    const root = uf.find(id(s))
    if (!clusterMap.has(root)) clusterMap.set(root, [])
    clusterMap.get(root)!.push(s)
  }
  const candidates = Array.from(clusterMap.values()).filter((c) => c.length > 1)
  console.log(`Found ${candidates.length} candidate clusters covering ${candidates.reduce((n, c) => n + c.length, 0)} shops`)

  const ownedClusters = candidates.filter((c) => c.some((s) => s.owner_user_id))

  // ── Keeper + per-member checks ──────────────────────────────────────────────
  const reviewRows: Row[] = []
  const reviewedPairs = new Set<string>()
  const pairKey = (a: Row, b: Row) => [id(a), id(b)].sort().join("|")
  const merges: { keeper: Row; dupes: Row[]; excluded: { shop: Row; reasons: string[] }[] }[] = []

  for (const cluster of candidates) {
    if (cluster.some((s) => s.owner_user_id)) continue
    const keeper = pickKeeper(cluster)
    const [klat, klng] = coords(keeper)!
    const keeperPhone = normalizePhone(keeper.phone)
    const dupes: Row[] = []
    const excluded: { shop: Row; reasons: string[] }[] = []
    for (const s of cluster) {
      if (s === keeper) continue
      const [lat, lng] = coords(s)!
      const reasons: string[] = []
      if (haversineMeters(klat, klng, lat, lng) > CLUSTER_RADIUS_M) reasons.push(REASON_DISTANCE)
      const phone = normalizePhone(s.phone)
      if (keeperPhone && phone && keeperPhone !== phone) reasons.push(REASON_PHONE)
      if (reasons.length === 0) {
        dupes.push(s)
        continue
      }
      excluded.push({ shop: s, reasons })
      reviewRows.push(reviewRow(reasons.join("; "), keeper, s))
      reviewedPairs.add(pairKey(keeper, s))
    }
    merges.push({ keeper, dupes, excluded })
  }

  const mergeable = merges.filter((m) => m.dupes.length > 0)
  const ctx = await loadMergeContext(
    supabase,
    mergeable.flatMap((m) => [m.keeper, ...m.dupes].map(id))
  )
  const results: (MergeResult & { clusterId: number; excluded: { shop: Row; reasons: string[] }[] })[] = mergeable.map(
    (m, i) => ({ ...planMerge(m.keeper, m.dupes, ctx), clusterId: i + 1, excluded: m.excluded })
  )
  const dupeShopIds = new Set(results.flatMap((r) => r.dupes.map(id)))
  const writes: Write[] = results.flatMap((r) => r.writes)

  // Rows that still point at a duplicate shop after the merge and that this
  // script does not touch — reported so nothing is hidden.
  const dupeIdList = Array.from(dupeShopIds)
  const bookingsLeft = (await fetchIn(supabase, "booking_requests", "id, shop_id", "shop_id", dupeIdList)).length
  const stylesLeft = (await fetchIn(supabase, "shop_styles", "shop_id", "shop_id", dupeIdList).catch(() => [])).length

  // ── Near-matches for human review (never merged) ────────────────────────────
  // Compared against the post-merge active set: keepers + everything unclustered.
  const survivors = located.filter((s) => !dupeShopIds.has(id(s)))
  const grid = new GridIndex<Row>(0.005, 0.008) // ≥ ~375m cells up to ~65°N
  for (const s of survivors) {
    const [lat, lng] = coords(s)!
    grid.add(lat, lng, s)
  }
  for (const a of survivors) {
    const [lat1, lng1] = coords(a)!
    const na = normalizeName(a.name)
    const pa = normalizePhone(a.phone)
    for (const b of grid.near(lat1, lng1)) {
      if (id(a) >= id(b) || reviewedPairs.has(pairKey(a, b))) continue
      const [lat2, lng2] = coords(b)!
      const dist = haversineMeters(lat1, lng1, lat2, lng2)
      if (dist > REVIEW_PHONE_RADIUS_M) continue
      const reasons: string[] = []
      if (dist <= REVIEW_NAME_RADIUS_M && similarity(na, normalizeName(b.name)) >= REVIEW_NAME_SIMILARITY)
        reasons.push("similar_name")
      if (pa && pa === normalizePhone(b.phone)) reasons.push("same_phone")
      if (reasons.length === 0) continue
      reviewedPairs.add(pairKey(a, b))
      reviewRows.push(reviewRow(reasons.join("+"), a, b))
    }
  }

  // ── Reports ─────────────────────────────────────────────────────────────────
  const planRows: Row[] = results.map((p) => ({
    cluster_id: p.clusterId,
    status: "merge",
    keeper_id: id(p.keeper),
    keeper_name: p.keeper.name,
    keeper_place_id: p.keeper.place_id,
    keeper_address: p.keeper.address,
    merged_ids: p.dupes.map(id).join(";"),
    merged_names: p.dupes.map((d) => d.name).join(";"),
    merged_addresses: p.dupes.map((d) => d.address).join(";"),
    excluded_ids: p.excluded.map((e) => `${id(e.shop)} (${e.reasons.join("; ")})`).join(";"),
    city: p.keeper.city,
    state: p.keeper.state,
    max_distance_m: Math.round(p.maxDistanceM),
    fields_filled: p.fieldsFilled.join(";"),
    shop_artists_moved: p.shopArtistsMoved,
    shop_artists_left_on_inactive: p.shopArtistsLeft,
    artists_moved: p.artistsMoved,
    artists_merged: p.artistsMerged,
    child_rows_repointed: p.childRowsRepointed,
    protected_artists_not_merged: p.protectedArtists.join(";"),
  }))
  ownedClusters.forEach((c, i) => {
    planRows.push({
      cluster_id: `owned-${i + 1}`,
      status: "skipped_owner_user_id",
      merged_ids: c.map(id).join(";"),
      merged_names: c.map((s) => s.name).join(";"),
      city: c[0].city,
      state: c[0].state,
      protected_artists_not_merged: `owned shops: ${c.filter((s) => s.owner_user_id).map(id).join(";")}`,
    })
  })

  const planPath = writeCsv(
    "data/merge-plan.csv",
    [
      "cluster_id", "status", "keeper_id", "keeper_name", "keeper_place_id", "keeper_address", "merged_ids",
      "merged_names", "merged_addresses", "excluded_ids", "city", "state", "max_distance_m", "fields_filled",
      "shop_artists_moved", "shop_artists_left_on_inactive", "artists_moved", "artists_merged",
      "child_rows_repointed", "protected_artists_not_merged",
    ],
    planRows
  )
  const reviewPath = writeCsv(
    "data/merge-review.csv",
    REVIEW_HEADERS,
    reviewRows.sort((a, b) => String(a.reason).localeCompare(String(b.reason)) || Number(a.distance_m) - Number(b.distance_m))
  )

  const sum = (f: (p: MergeResult) => number) => results.reduce((n, p) => n + f(p), 0)
  const fieldCounts: Record<string, number> = {}
  for (const p of results) for (const f of p.fieldsFilled) fieldCounts[f] = (fieldCounts[f] ?? 0) + 1
  const byReason: Record<string, number> = {}
  for (const r of reviewRows) byReason[String(r.reason)] = (byReason[String(r.reason)] ?? 0) + 1
  const fullyExcluded = merges.length - mergeable.length

  console.log(`\n── Summary ──`)
  console.log(`Clusters to merge:                 ${results.length}`)
  console.log(`Clusters with nothing left to merge: ${fullyExcluded}`)
  console.log(`Clusters skipped (owner_user_id):  ${ownedClusters.length}`)
  console.log(`Shops to deactivate:               ${dupeShopIds.size}`)
  console.log(`Shops kept active by new rules:    ${merges.reduce((n, m) => n + m.excluded.length, 0)}`)
  console.log(`Keepers with fields filled:        ${results.filter((p) => p.fieldsFilled.length > 0).length}`)
  console.log(`  by field: ${Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f}=${n}`).join(", ") || "—"}`)
  console.log(`shop_artists re-pointed to keeper: ${sum((p) => p.shopArtistsMoved)}`)
  console.log(`shop_artists left on inactive:     ${sum((p) => p.shopArtistsLeft)}`)
  console.log(`Artists moved to keeper:           ${sum((p) => p.artistsMoved)}`)
  console.log(`Artists merged + deactivated:      ${sum((p) => p.artistsMerged)}`)
  console.log(`Child rows re-pointed:             ${sum((p) => p.childRowsRepointed)}`)
  console.log(`Claimed/user artists NOT merged:   ${sum((p) => p.protectedArtists.length)}`)
  for (const p of results)
    for (const a of p.protectedArtists) console.log(`  cluster ${p.clusterId} (${p.keeper.name}): ${a}`)
  console.log(`Pairs sent to review:              ${reviewRows.length}`)
  for (const [reason, n] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) console.log(`  ${reason.padEnd(42)} ${n}`)
  console.log(`Not touched (FYI): booking_requests.shop_id on deactivated shops: ${bookingsLeft}, shop_styles rows: ${stylesLeft}`)
  console.log(`Total row updates planned:         ${writes.length}`)
  console.log(`\nWrote ${planPath}`)
  console.log(`Wrote ${reviewPath}`)

  if (!ARGS.apply) {
    console.log("\nDRY RUN — no changes made. Re-run with --apply to merge.")
    return
  }

  const undo = new UndoLog("merge-duplicate-shops")
  let done = 0
  // Sequential on purpose: order matters (fills before deactivations) and it
  // keeps the undo log in the same order the writes happened.
  for (const w of writes) {
    await loggedUpdate(supabase, undo, w.table, w.id, w.oldRow, w.patch)
    if (++done % 250 === 0) console.log(`  ${done}/${writes.length} updates`)
  }
  console.log(`\nApplied ${done} updates. Undo log: ${undo.file}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
