// merge-same-address-shops.ts
// Finds listed shops (active, not possibly closed) that share name, city,
// state AND address (case-insensitive) — duplicate rows that would otherwise
// show identical page titles — and merges each group with the shared logic in
// scripts/lib/shop-merge.ts (keeper = Google place_id, else richest row, else
// oldest; blanks filled from the duplicate; artists moved; duplicate hidden).
// A group is merged only when its phones agree or all but one are blank;
// groups with conflicting phones, or a claimed shop, are listed and left alone.
// Run: npx tsx scripts/merge-same-address-shops.ts [--apply --expect N]
//   Dry-run by default; --apply writes (undo-logged). --expect takes the dry
//   run's merge count and aborts before any write if it has changed.

import { config } from "dotenv"
config({ path: ".env.local" })

import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog, loggedUpdate } from "./lib/undo-log"
import { fetchAll, fetchIn, modeBanner, normalizePhone } from "./lib/cleanup-utils"
import { withRetry } from "./lib/retry"
import { loadMergeContext, pickKeeper, planMerge, rowId, type Row } from "./lib/shop-merge"

const ARGS = parseScriptArgs()

const key = (s: Row) =>
  [s.name, s.city, s.state, s.address].map((v) => String(v ?? "").trim().toLowerCase()).join("|")

async function main() {
  modeBanner(ARGS.apply)
  const supabase = getSupabaseAdmin()

  const listed = await withRetry("fetch shops", () =>
    fetchAll(supabase, "shops", "id, name, city, state, address", (q) => q.eq("is_active", true).eq("possibly_closed", false))
  )
  const groups = new Map<string, string[]>()
  for (const s of listed) groups.set(key(s), [...(groups.get(key(s)) ?? []), rowId(s)])
  const dupGroups = [...groups.values()].filter((ids) => ids.length > 1)

  const allIds = dupGroups.flat()
  const shops = new Map((await fetchIn(supabase, "shops", "*", "id", allIds)).map((s) => [rowId(s), s]))
  const artists = await fetchIn(supabase, "artists", "id, shop_id, is_active", "shop_id", allIds)
  const artistCount = (id: string) => artists.filter((a) => a.shop_id === id && a.is_active).length

  console.log(`Listed shops scanned: ${listed.length}`)
  console.log(`Groups with the same name, city, state and address: ${dupGroups.length}\n`)

  const toMerge: Row[][] = []
  const conflicts: string[] = []
  for (const ids of dupGroups) {
    const rows = ids.map((id) => shops.get(id)!).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    console.log(`${rows[0].name} | ${rows[0].address}, ${rows[0].city}, ${rows[0].state}`)
    for (const s of rows)
      console.log(
        `  ${s.id} | phone ${s.phone || "—"} | ${s.website || "no website"} | ${s.rating ?? "-"}★ / ${s.review_count ?? 0} | ` +
          `${artistCount(rowId(s))} artists | created ${String(s.created_at).slice(0, 10)}`
      )
    const phones = new Set(rows.map((s) => normalizePhone(s.phone)).filter(Boolean))
    if (phones.size > 1) {
      console.log(`  → LEFT ALONE: phones conflict\n`)
      conflicts.push(`${rows[0].name} (${ids.join(", ")})`)
    } else if (rows.some((s) => s.owner_user_id)) {
      console.log(`  → LEFT ALONE: a shop is claimed\n`)
      conflicts.push(`${rows[0].name} (${ids.join(", ")}) — claimed`)
    } else {
      const keeper = pickKeeper(rows)
      console.log(`  → merge: keep ${keeper.id}\n`)
      toMerge.push(rows)
    }
  }

  console.log(`── Summary ──`)
  console.log(`Groups to merge (phones match or blank): ${toMerge.length}`)
  console.log(`Groups left alone: ${conflicts.length}`)
  for (const c of conflicts) console.log(`  ${c}`)

  if (ARGS.apply) {
    const i = process.argv.indexOf("--expect")
    if (i === -1 || Number(process.argv[i + 1]) !== toMerge.length) {
      console.error(`\nAborted before writing: ${toMerge.length} merges doesn't match --expect ${i === -1 ? "(missing)" : process.argv[i + 1]}.`)
      process.exit(1)
    }
  }
  const undo = ARGS.apply ? new UndoLog("merge-same-address-shops") : null
  let updates = 0
  for (const rows of toMerge) {
    // Re-read so each merge plans against the current database state.
    const fresh = await fetchIn(supabase, "shops", "*", "id", rows.map(rowId))
    const keeper = pickKeeper(fresh)
    const dupes = fresh.filter((s) => s !== keeper)
    const plan = planMerge(keeper, dupes, await loadMergeContext(supabase, fresh.map(rowId)))
    console.log(
      `\n${ARGS.apply ? "merged" : "would merge"}: keep ${keeper.name} (${rowId(keeper)}), hide ${dupes.map(rowId).join(", ")}` +
        ` | fields filled: ${plan.fieldsFilled.join(", ") || "—"} | artists moved ${plan.artistsMoved}, merged ${plan.artistsMerged}` +
        ` | shop_artists moved ${plan.shopArtistsMoved} | row updates ${plan.writes.length}` +
        (plan.protectedArtists.length ? ` | claimed artists NOT merged: ${plan.protectedArtists.join("; ")}` : "")
    )
    if (undo)
      for (const w of plan.writes)
        await withRetry(`update ${w.table} ${w.id}`, () => loggedUpdate(supabase, undo, w.table, w.id, w.oldRow, w.patch))
    updates += plan.writes.length
  }

  console.log(`\nRow updates: ${updates}`)
  if (undo) console.log(`Undo log: ${undo.file} (${undo.entries} entries)`)
  else console.log("Dry run — nothing written. Pass --apply --expect N to write (undo-logged).")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
