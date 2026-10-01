// apply-review-decisions.ts
// Applies the human decisions added to the review CSVs in a "decision" column:
//   data/non-tattoo-review.csv  decision "remove" → shop is_active=false
//   data/merge-review.csv       decision "merge"  → merge shop_a + shop_b using
//                               the same keeper/fill/artist logic as
//                               merge-duplicate-shops.ts (scripts/lib/shop-merge.ts)
// Any other decision → no change. Blank decisions are skipped and counted.
// Run: npx tsx scripts/apply-review-decisions.ts [--apply]
//   Dry-run by default; --apply writes (undo-logged).

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import type { SupabaseClient } from "@supabase/supabase-js"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog, loggedUpdate } from "./lib/undo-log"
import { fetchIn, modeBanner, parseCSV } from "./lib/cleanup-utils"
import { loadMergeContext, pickKeeper, planMerge, rowId, type Row } from "./lib/shop-merge"

const ARGS = parseScriptArgs()
const NON_TATTOO_CSV = path.resolve("data/non-tattoo-review.csv")
const MERGE_REVIEW_CSV = path.resolve("data/merge-review.csv")

interface Tally {
  acted: number
  blank: number
  other: Record<string, number>
  skipped: string[]
}

function newTally(): Tally {
  return { acted: 0, blank: 0, other: {}, skipped: [] }
}

// Rows of a review CSV, or null (with a message) if it has no decision column.
function readDecisions(file: string): Record<string, string>[] | null {
  if (!fs.existsSync(file)) {
    console.log(`  ${file} not found — skipped`)
    return null
  }
  const rows = parseCSV(fs.readFileSync(file, "utf-8"))
  if (rows.length > 0 && !("decision" in rows[0])) {
    console.log(`  ${file} has no "decision" column yet — skipped`)
    return null
  }
  return rows
}

function decisionOf(row: Record<string, string>): string {
  return (row.decision ?? "").trim().toLowerCase()
}

async function applyNonTattoo(supabase: SupabaseClient, undo: UndoLog | null): Promise<Tally> {
  const t = newTally()
  console.log(`\n── non-tattoo-review ──`)
  const rows = readDecisions(NON_TATTOO_CSV)
  if (!rows) return t

  const removeIds: string[] = []
  for (const r of rows) {
    const d = decisionOf(r)
    if (!d) t.blank++
    else if (d === "remove") removeIds.push(r.id)
    else t.other[d] = (t.other[d] ?? 0) + 1
  }

  const shops = await fetchIn(supabase, "shops", "id, name, is_active, owner_user_id", "id", removeIds)
  const byId = new Map(shops.map((s) => [rowId(s), s]))
  for (const shopId of removeIds) {
    const s = byId.get(shopId)
    if (!s) { t.skipped.push(`${shopId}: not found`); continue }
    if (!s.is_active) { t.skipped.push(`${s.name} (${shopId}): already inactive`); continue }
    if (s.owner_user_id) { t.skipped.push(`${s.name} (${shopId}): has owner_user_id — not removed`); continue }
    if (undo) await loggedUpdate(supabase, undo, "shops", shopId, s, { is_active: false })
    t.acted++
  }
  return t
}

async function applyMerges(supabase: SupabaseClient, undo: UndoLog | null): Promise<Tally & { updates: number }> {
  const t = { ...newTally(), updates: 0 }
  console.log(`\n── merge-review ──`)
  const rows = readDecisions(MERGE_REVIEW_CSV)
  if (!rows) return t

  // Shops this run has (or in a dry run, would have) deactivated, so a later
  // pair that involves one of them is skipped instead of merged twice.
  const deactivated = new Set<string>()

  for (const r of rows) {
    const d = decisionOf(r)
    if (!d) { t.blank++; continue }
    if (d !== "merge") { t.other[d] = (t.other[d] ?? 0) + 1; continue }

    const label = `${r.shop_a_name} (${r.shop_a_id}) + ${r.shop_b_name} (${r.shop_b_id})`
    // Re-read both shops so each pair plans against the current database state.
    const shops = await fetchIn(supabase, "shops", "*", "id", [r.shop_a_id, r.shop_b_id])
    if (shops.length !== 2) { t.skipped.push(`${label}: shop not found`); continue }
    if (shops.some((s) => !s.is_active || deactivated.has(rowId(s)))) {
      t.skipped.push(`${label}: a shop is already inactive / merged earlier in this run`)
      continue
    }
    if (shops.some((s) => s.owner_user_id)) { t.skipped.push(`${label}: has owner_user_id`); continue }

    const keeper = pickKeeper(shops)
    const dupe = shops.find((s) => s !== keeper) as Row
    const ctx = await loadMergeContext(supabase, shops.map(rowId))
    const plan = planMerge(keeper, [dupe], ctx)
    console.log(
      `  merge → keep ${keeper.name} (${rowId(keeper)}), deactivate ${rowId(dupe)}` +
        ` | fields filled: ${plan.fieldsFilled.join(", ") || "—"}` +
        ` | artists moved ${plan.artistsMoved}, merged ${plan.artistsMerged}` +
        (plan.protectedArtists.length ? ` | claimed artists NOT merged: ${plan.protectedArtists.join("; ")}` : "")
    )
    if (undo) for (const w of plan.writes) await loggedUpdate(supabase, undo, w.table, w.id, w.oldRow, w.patch)
    deactivated.add(rowId(dupe))
    t.updates += plan.writes.length
    t.acted++
  }
  return t
}

function printTally(name: string, verb: string, t: Tally): void {
  console.log(`${name}: ${verb} ${t.acted}, blank (skipped) ${t.blank}, other decisions (no change) ${Object.values(t.other).reduce((a, b) => a + b, 0)}${Object.keys(t.other).length ? ` ${JSON.stringify(t.other)}` : ""}`)
  for (const s of t.skipped) console.log(`  skipped: ${s}`)
}

async function main() {
  modeBanner(ARGS.apply)
  const supabase = getSupabaseAdmin()
  const undo = ARGS.apply ? new UndoLog("apply-review-decisions") : null

  const nonTattoo = await applyNonTattoo(supabase, undo)
  const merges = await applyMerges(supabase, undo)

  const would = ARGS.apply ? "" : "would "
  console.log(`\n── Summary ──`)
  printTally("non-tattoo-review", `${would}deactivate`, nonTattoo)
  printTally("merge-review", `${would}merge`, merges)
  console.log(`Row updates from merges: ${merges.updates}`)

  if (undo && undo.entries > 0) console.log(`\nUndo log: ${undo.file}`)
  if (!ARGS.apply) console.log("\nDRY RUN — no changes made. Re-run with --apply to write.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
