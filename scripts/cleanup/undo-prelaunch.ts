// scripts/cleanup/undo-prelaunch.ts
// Reverses scripts/cleanup/prelaunch.ts from its undo log: hidden listings and
// artists come back, moved artists return to their old shop, filled fields are
// emptied again, cleaned names and cleared photos get their old values, and
// possibly_closed goes back to false. Nothing is deleted.
// Run: npx tsx scripts/cleanup/undo-prelaunch.ts --input data/undo/prelaunch-cleanup-<timestamp>.jsonl [--apply]
//   Dry run by default: reports what would be undone and any field whose
//   current value no longer matches what the cleanup wrote (changed since; left
//   alone). --apply undoes and undo-logs its own writes.

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { parseScriptArgs } from "../lib/args"
import { getSupabaseAdmin } from "../lib/supabase-admin"
import { UndoLog, type UndoEntry } from "../lib/undo-log"
import { fetchIn, modeBanner, runPool } from "../lib/cleanup-utils"
import { withRetry } from "../lib/retry"

const ARGS = parseScriptArgs()
const SCRIPT = "prelaunch-cleanup"
const TABLES = new Set(["shops", "artists", "shop_artists"])

// Timestamps come back from Postgres as "+00:00", the log has "Z".
const norm = (v: unknown) => (typeof v === "string" && /^\d{4}-\d\d-\d\dT/.test(v) ? new Date(v).toISOString() : v ?? null)
const same = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b))

async function main() {
  if (!ARGS.input) {
    console.error("Usage: npx tsx scripts/cleanup/undo-prelaunch.ts --input data/undo/prelaunch-cleanup-<timestamp>.jsonl [--apply]")
    process.exit(1)
  }
  const file = path.resolve(ARGS.input)
  if (!fs.existsSync(file)) throw new Error(`No such file: ${file}`)
  modeBanner(ARGS.apply)

  const entries = fs
    .readFileSync(file, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as UndoEntry)
    .filter((e) => e.op !== "note") // kept values (a duplicate's other phone), nothing to restore
  const foreign = entries.filter((e) => e.script !== SCRIPT || !TABLES.has(e.table) || e.op === "insert")
  if (foreign.length) throw new Error(`${foreign.length} entries are not from ${SCRIPT}; refusing.`)

  // Each field is written once per run, so one entry per table|id|field.
  const supabase = getSupabaseAdmin()
  const restore = new Map<string, UndoEntry[]>() // table|id → entries to restore
  const changedSince: UndoEntry[] = []
  for (const table of Array.from(TABLES)) {
    const mine = entries.filter((e) => e.table === table)
    if (!mine.length) continue
    const fields = Array.from(new Set(mine.map((e) => e.field)))
    const ids = Array.from(new Set(mine.map((e) => e.id)))
    const current = new Map(
      (await withRetry(`fetch ${table}`, () => fetchIn(supabase, table, ["id", ...fields].join(", "), "id", ids))).map((r) => [String(r.id), r]),
    )
    for (const e of mine) {
      const row = current.get(e.id)
      if (!row || !same(row[e.field], e.new_value)) {
        changedSince.push(e)
        continue
      }
      const k = `${table}|${e.id}`
      restore.set(k, [...(restore.get(k) ?? []), e])
    }
  }

  const tally = new Map<string, number>()
  for (const es of restore.values()) for (const e of es) tally.set(`${e.table}.${e.field}`, (tally.get(`${e.table}.${e.field}`) ?? 0) + 1)
  console.log(`Log: ${file} (${entries.length} entries)`)
  for (const [k, n] of Array.from(tally.entries()).sort()) console.log(`  restore ${k.padEnd(36)} ${n}`)
  console.log(`  changed since (left alone): ${changedSince.length}`)
  for (const e of changedSince.slice(0, 20)) console.log(`    ${e.table} ${e.id} ${e.field}`)

  if (!ARGS.apply) {
    console.log("\nDry run: nothing written. Pass --apply to undo.")
    return
  }

  const undo = new UndoLog(`undo-${SCRIPT}`)
  let rows = 0
  await runPool(Array.from(restore.values()), 10, async (es) => {
    const { table, id } = es[0]
    undo.append(es.map((e) => ({ table, id, field: e.field, old_value: e.new_value, new_value: e.old_value })))
    const patch = Object.fromEntries(es.map((e) => [e.field, e.old_value]))
    await withRetry(`restore ${table} ${id}`, async () => {
      const { error } = await supabase.from(table).update(patch).eq("id", id)
      if (error) throw new Error(error.message)
    })
    rows++
  })
  console.log(`\nRestored ${rows} rows. Undo log for this undo: ${undo.file}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
