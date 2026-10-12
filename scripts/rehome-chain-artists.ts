// rehome-chain-artists.ts
// dedupe-chain-artists.ts kept each chain artist at the cluster's home shop
// (most reviews), which put Atomic Tattoos' whole roster in Lakeland though
// most of its shops are in Tampa Bay. For clusters of 5 or more shops this
// moves each artist to the shop at the center of the chain instead: the
// hidden copy there is made active and the current keeper is hidden. Never
// deletes; the active artist count doesn't change.
//
// 1. Rebuild the dedupe's clusters and groups from its undo log: the hidden
//    copies plus the currently active rows, grouped by scripts/lib/chain-artists.ts.
//    Stops unless that reproduces the log exactly.
// 2. For clusters of 5+ shops: center = median latitude and median longitude of
//    the cluster's active shops with coordinates. New home = the closest such
//    shop in the state most of them are in (ties: most reviews, then oldest,
//    then id). No change when that is the current home.
//    Two clusters are excluded by home shop id (EXCLUDE below).
// 3. Per artist: make the copy at the new home active, give it the fields the
//    dedupe filled on the keeper (only where empty), and hide the keeper.
//    Skipped and reported: claimed keepers, keepers referenced elsewhere, and
//    artists with no copy at the new home.
//
// Run: npx tsx scripts/rehome-chain-artists.ts [--apply] [--output shops]
//   Dry run by default: writes data/reports/rehome-chain-artists-dryrun.csv.
//   --output shops also lists each changed cluster's shops.
//   --apply recomputes, refuses unless it matches that CSV exactly, then writes
//   in batches of 500, undo-logged to data/undo/rehome-chain-artists-<timestamp>.jsonl.
//   Undo: npx tsx scripts/undo-rehome-chain-artists.ts --input <log> [--apply]

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog, type UndoEntry } from "./lib/undo-log"
import { fetchAll, fetchIn, modeBanner, parseCSV, writeCsv } from "./lib/cleanup-utils"
import { withRetry } from "./lib/retry"
import {
  ARTIST_COLUMNS,
  SHOP_COLUMNS,
  blank,
  buildGroups,
  compareArtistsByAge,
  milesBetween,
  referencedArtistIds,
  referencingTables,
  toArtist,
  toShop,
  type Artist,
  type Shop,
} from "./lib/chain-artists"

const ARGS = parseScriptArgs()
const SCRIPT = "rehome-chain-artists"
const DEDUPE_LOG = "data/undo/dedupe-chain-artists-2026-10-12T18-58-04-482Z.jsonl"
const REPORT = "data/reports/rehome-chain-artists-dryrun.csv"
const MIN_SHOPS = 5
const BATCH = 500
// Clusters left where the dedupe put them, by current home shop id.
const EXCLUDE: Record<string, string> = {
  // The same 4 artists copied onto 8 unrelated shops in OR, WA and CA (a shared
  // website domain, not a chain); moving them to Seattle could be wrong.
  "17b7d232-3d0a-4347-8b43-21a3233e053a": "High Priestess Piercing & Tattoo (Eugene, OR): not a real chain",
  // Old and new home are two rows for the same shop, 0.1 mi apart; swapping changes nothing for users.
  "308dd095-3b96-49f3-b177-f3907e6a818a": "Aloha Tattoo Diamond, Waikiki (Honolulu, HI): new home is a duplicate row of the same shop",
}

// The finder check from the brief: Japanese artists within 25 mi of Tampa.
const CHECK = { lat: 27.98, lng: -82.48, radius: 25, style: "japanese" }

interface Swap {
  clusterId: string
  keeper: Artist
  copy: Artist
  fills: Record<string, unknown>
}

function median(values: number[]): number {
  const v = [...values].sort((a, b) => a - b)
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

/** Closest first; ties: most reviews (nulls last), then oldest, then id. */
function compareByDistance(dist: Map<string, number>) {
  return (a: Shop, b: Shop) => {
    const d = dist.get(a.id)! - dist.get(b.id)!
    if (d !== 0) return d
    const ra = a.reviews ?? -1
    const rb = b.reviews ?? -1
    if (ra !== rb) return rb - ra
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
    return a.id < b.id ? -1 : 1
  }
}

/** Active artists in the finder check, from rows in memory (same rules as finder_artists_near). */
function finderCount(artists: Artist[], active: Set<string>, shops: Map<string, Shop>): number {
  return artists.filter((a) => {
    if (!active.has(a.id) || !a.styles.includes(CHECK.style)) return false
    const s = shops.get(a.shopId)
    if (!s || !s.isActive || s.possiblyClosed || s.lat == null || s.lng == null) return false
    return milesBetween(CHECK.lat, CHECK.lng, s.lat, s.lng) <= CHECK.radius
  }).length
}

async function main() {
  modeBanner(ARGS.apply)
  const supabase = getSupabaseAdmin()

  // The dedupe's undo log: which rows it hid and what it filled on keepers.
  const log = fs
    .readFileSync(DEDUPE_LOG, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as UndoEntry)
  const hiddenIds = new Set(log.filter((e) => e.field === "is_active").map((e) => e.id))
  const filled = new Map<string, Record<string, unknown>>()
  for (const e of log.filter((e) => e.field !== "is_active")) filled.set(e.id, { ...filled.get(e.id), [e.field]: e.new_value })

  // Everything the dedupe saw: today's active rows plus the rows it hid.
  const activeRows = await withRetry("fetch active artists", () =>
    fetchAll(supabase, "artists", ARTIST_COLUMNS, (q) => q.eq("is_active", true)),
  )
  const hiddenRows = await withRetry("fetch hidden copies", () =>
    fetchIn(supabase, "artists", ARTIST_COLUMNS, "id", Array.from(hiddenIds)),
  )
  const stillHidden = hiddenRows.filter((r) => r.is_active === false)
  if (stillHidden.length !== hiddenIds.size) {
    throw new Error(`STOP: ${hiddenIds.size - stillHidden.length} rows from the dedupe log are no longer hidden.`)
  }
  const activeIds = new Set(activeRows.map((r) => String(r.id)))
  const artists = [...activeRows, ...stillHidden].filter((r) => r.shop_id).map(toArtist)
  const shopIds = Array.from(new Set(artists.map((a) => a.shopId)))
  const shops = new Map<string, Shop>(
    (await withRetry("fetch shops", () => fetchIn(supabase, "shops", SHOP_COLUMNS, "id", shopIds))).map((s) => [
      String(s.id),
      toShop(s),
    ]),
  )
  const { clusters, homeShop, groups } = buildGroups(artists, shops)

  // Must reproduce the dedupe exactly: every group has one active row (its
  // keeper) and the rest are the rows the log hid.
  const keeperOf = new Map<string, Artist>()
  const regrouped = new Set<string>()
  for (const g of groups) {
    const active = g.rows.filter((r) => activeIds.has(r.id))
    if (active.length !== 1) throw new Error(`STOP: group ${g.key} in ${g.clusterId} has ${active.length} active rows.`)
    keeperOf.set(`${g.clusterId}|${g.key}`, active[0])
    for (const r of g.rows) if (r.id !== active[0].id) regrouped.add(r.id)
  }
  const missing = Array.from(hiddenIds).filter((id) => !regrouped.has(id))
  if (regrouped.size !== hiddenIds.size || missing.length) {
    throw new Error(`STOP: rebuilt groups hide ${regrouped.size} rows, the log hid ${hiddenIds.size}.`)
  }
  console.log(`Rebuilt from ${DEDUPE_LOG}: ${clusters.size} clusters, ${groups.length} groups, ${regrouped.size} hidden copies (matches the log).`)

  const refs = await referencedArtistIds(supabase)

  // New homes for clusters of 5+ shops.
  const swaps: Swap[] = []
  const skipped: { name: string; cluster: string; reason: string }[] = []
  const changed: { root: string; oldHome: Shop; newHome: Shop; miles: number; state: string; states: string; swaps: number }[] = []
  const unchanged: { root: string; home: Shop; shops: number }[] = []
  const excluded: string[] = []

  for (const [root, ids] of clusters) {
    if (ids.length < MIN_SHOPS) continue
    const usable = ids.map((id) => shops.get(id)!).filter((s) => s && s.isActive && s.lat != null && s.lng != null)
    if (usable.length === 0) continue
    const byState = new Map<string, number>()
    for (const s of usable) byState.set(s.state, (byState.get(s.state) ?? 0) + 1)
    const state = Array.from(byState.entries()).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0]
    const center = { lat: median(usable.map((s) => s.lat!)), lng: median(usable.map((s) => s.lng!)) }
    const candidates = usable.filter((s) => s.state === state)
    const dist = new Map(candidates.map((s) => [s.id, milesBetween(center.lat, center.lng, s.lat!, s.lng!)]))
    const newHome = [...candidates].sort(compareByDistance(dist))[0]
    const oldHome = homeShop.get(root)!

    if (EXCLUDE[oldHome.id]) {
      excluded.push(EXCLUDE[oldHome.id])
      continue
    }
    if (newHome.id === oldHome.id) {
      unchanged.push({ root, home: oldHome, shops: ids.length })
      continue
    }

    let count = 0
    for (const g of groups.filter((g) => g.clusterId === root)) {
      const keeper = keeperOf.get(`${g.clusterId}|${g.key}`)!
      if (keeper.shopId === newHome.id) continue
      if (keeper.claimed) {
        skipped.push({ name: keeper.name, cluster: oldHome.name, reason: "keeper is claimed" })
        continue
      }
      const copy = g.rows.filter((r) => r.shopId === newHome.id && !activeIds.has(r.id)).sort(compareArtistsByAge)[0]
      if (!copy) {
        skipped.push({ name: keeper.name, cluster: oldHome.name, reason: `no copy at ${newHome.name}` })
        continue
      }
      const usedBy = referencingTables(refs, [keeper.id])
      if (usedBy.length) {
        skipped.push({ name: keeper.name, cluster: oldHome.name, reason: `keeper is referenced by ${usedBy.join(", ")}` })
        continue
      }
      const fills: Record<string, unknown> = {}
      for (const [field, value] of Object.entries(filled.get(keeper.id) ?? {})) {
        if (blank(copy.row[field])) fills[field] = value
      }
      swaps.push({ clusterId: root, keeper, copy, fills })
      count++
    }
    changed.push({
      root,
      oldHome,
      newHome,
      miles: milesBetween(oldHome.lat ?? center.lat, oldHome.lng ?? center.lng, newHome.lat!, newHome.lng!),
      state,
      states: Array.from(byState.entries()).sort((x, y) => y[1] - x[1]).map(([st, n]) => `${st} ${n}`).join(", "),
      swaps: count,
    })
  }

  // Report.
  const label = (s: Shop) => `${s.name} (${s.city}, ${s.state})`
  console.log(
    `\nClusters with ${MIN_SHOPS}+ shops: ${changed.length + unchanged.length + excluded.length} (${changed.length} change home, ${unchanged.length} keep it, ${excluded.length} excluded)`,
  )
  for (const c of changed.sort((a, b) => b.swaps - a.swaps)) {
    console.log(
      `  ${clusters.get(c.root)!.length} shops: ${label(c.oldHome)} -> ${label(c.newHome)}, ${c.miles.toFixed(1)} mi, ${c.swaps} artists swapped [home ${c.oldHome.id}]`,
    )
    console.log(`      shops by state: ${c.states}`)
    if (ARGS.output === "shops") {
      for (const id of clusters.get(c.root)!) {
        const s = shops.get(id)!
        console.log(`        ${label(s)}${s.isActive ? "" : " [inactive]"}${s.lat == null ? " [no coords]" : ""}`)
      }
    }
  }
  for (const u of unchanged) console.log(`  ${u.shops} shops: stays at ${label(u.home)}`)
  for (const e of excluded) console.log(`  excluded: ${e}`)

  const fieldsCopied = swaps.reduce((n, s) => n + Object.keys(s.fills).length, 0)
  console.log(`\nClusters changed: ${changed.length}`)
  console.log(`Rows made active: ${swaps.length}`)
  console.log(`Rows hidden:      ${swaps.length}`)
  console.log(`Fields copied:    ${fieldsCopied}`)
  console.log(`Artists skipped:  ${skipped.length}`)
  for (const s of skipped) console.log(`  ${s.name} (${s.cluster}): ${s.reason}`)

  const { count: activeBefore } = await supabase.from("artists").select("id", { count: "exact", head: true }).eq("is_active", true)
  console.log(`\nActive artists: ${activeBefore} before, ${activeBefore} after (one made active for each one hidden)`)

  const afterActive = new Set(activeIds)
  for (const s of swaps) {
    afterActive.delete(s.keeper.id)
    afterActive.add(s.copy.id)
  }
  const { data: rpc } = await supabase.rpc("finder_artists_near", {
    p_lat: CHECK.lat,
    p_lng: CHECK.lng,
    p_radius_mi: CHECK.radius,
    p_styles: [CHECK.style],
    p_limit: 1,
    p_offset: 0,
  })
  const rpcBefore = Number((rpc as Record<string, unknown>[] | null)?.[0]?.total_count ?? 0)
  console.log(
    `finder_artists_near(${CHECK.lat}, ${CHECK.lng}, ${CHECK.radius}, '{${CHECK.style}}'): ${rpcBefore} now (in-memory check ${finderCount(artists, activeIds, shops)}), expected after ${finderCount(artists, afterActive, shops)}`,
  )

  const rows = swaps.map((s) => {
    const from = shops.get(s.keeper.shopId)!
    const to = shops.get(s.copy.shopId)!
    return {
      cluster_id: s.clusterId,
      name: s.keeper.name,
      styles: s.keeper.styles.join("+"),
      hide_id: s.keeper.id,
      hide_shop: `${from.name}, ${from.city}, ${from.state}`,
      unhide_id: s.copy.id,
      unhide_shop: `${to.name}, ${to.city}, ${to.state}`,
      fields_copied: Object.keys(s.fills).join("+"),
    }
  })
  const headers = ["cluster_id", "name", "styles", "hide_id", "hide_shop", "unhide_id", "unhide_shop", "fields_copied"]

  if (!ARGS.apply) {
    fs.mkdirSync("data/reports", { recursive: true })
    writeCsv(REPORT, headers, rows)
    console.log(`\nWrote ${REPORT} (${rows.length} swaps). Dry run: nothing written. Pass --apply to write.`)
    return
  }

  // --apply: must match the dry run exactly.
  if (!fs.existsSync(REPORT)) throw new Error(`Run the dry run first (${REPORT} is missing).`)
  const pair = (r: Record<string, unknown>) => `${r.hide_id}>${r.unhide_id}>${r.fields_copied}`
  const planned = new Set(parseCSV(fs.readFileSync(REPORT, "utf-8")).map(pair))
  const now = new Set(rows.map(pair))
  if (planned.size !== now.size || Array.from(now).some((p) => !planned.has(p))) {
    console.error("\nSTOP: the swaps differ from the dry run. Nothing written.")
    process.exit(1)
  }

  const undo = new UndoLog(SCRIPT)
  const unhide = swaps.map((s) => s.copy.id)
  const hide = swaps.map((s) => s.keeper.id)
  for (let i = 0; i < unhide.length; i += BATCH) {
    const batch = unhide.slice(i, i + BATCH)
    undo.append(batch.map((id) => ({ table: "artists", id, field: "is_active", old_value: false, new_value: true })))
    await withRetry(`unhide batch ${i / BATCH + 1}`, async () => {
      const { error } = await supabase.from("artists").update({ is_active: true }).in("id", batch).eq("is_active", false)
      if (error) throw new Error(error.message)
    })
  }
  for (const s of swaps.filter((s) => Object.keys(s.fills).length > 0)) {
    undo.append(
      Object.entries(s.fills).map(([field, value]) => ({
        table: "artists",
        id: s.copy.id,
        field,
        old_value: s.copy.row[field] ?? null,
        new_value: value,
      })),
    )
    await withRetry(`fill ${s.copy.id}`, async () => {
      const { error } = await supabase.from("artists").update(s.fills).eq("id", s.copy.id)
      if (error) throw new Error(error.message)
    })
  }
  for (let i = 0; i < hide.length; i += BATCH) {
    const batch = hide.slice(i, i + BATCH)
    undo.append(batch.map((id) => ({ table: "artists", id, field: "is_active", old_value: true, new_value: false })))
    await withRetry(`hide batch ${i / BATCH + 1}`, async () => {
      const { error } = await supabase.from("artists").update({ is_active: false }).in("id", batch).eq("is_active", true)
      if (error) throw new Error(error.message)
    })
  }
  console.log(`\nMade ${unhide.length} copies active, hid ${hide.length} keepers, copied ${fieldsCopied} fields.`)
  console.log(`Undo log: ${undo.file} (${undo.entries} entries)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
