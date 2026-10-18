// scripts/by-appointment/undo-import.ts
// Reverses scripts/by-appointment/import.ts from its undo log: the artists it
// added go to is_active=false (never deleted). Artists claimed since, or no
// longer active, are left alone and listed.
// Run: npx tsx scripts/by-appointment/undo-import.ts --input data/undo/by-appointment-import-<timestamp>.jsonl [--apply]
//   Dry run by default. --apply hides in batches of 500 and undo-logs its own writes.

import { config } from "dotenv"
config({ path: ".env.local", quiet: true })

import fs from "fs"
import path from "path"
import { parseScriptArgs } from "../lib/args"
import { getSupabaseAdmin } from "../lib/supabase-admin"
import { UndoLog, type UndoEntry } from "../lib/undo-log"
import { fetchIn, modeBanner } from "../lib/cleanup-utils"
import { withRetry } from "../lib/retry"

const ARGS = parseScriptArgs()
const SCRIPT = "by-appointment-import"
const BATCH = 500

async function main() {
  if (!ARGS.input) {
    console.error("Usage: npx tsx scripts/by-appointment/undo-import.ts --input data/undo/by-appointment-import-<timestamp>.jsonl [--apply]")
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
  const foreign = entries.filter((e) => e.script !== SCRIPT || e.table !== "artists" || e.field !== "is_active")
  if (foreign.length) throw new Error(`${foreign.length} entries are not from ${SCRIPT}; refusing.`)

  const supabase = getSupabaseAdmin()
  const ids = Array.from(new Set(entries.map((e) => e.id)))
  const rows = await withRetry("fetch artists", () => fetchIn(supabase, "artists", "id, is_active, is_claimed, user_id, display_name", "id", ids))
  const byId = new Map(rows.map((r) => [String(r.id), r]))
  const hide: string[] = []
  const leave: string[] = []
  for (const id of ids) {
    const r = byId.get(id)
    if (!r) leave.push(`${id} (not found)`)
    else if (r.is_active !== true) leave.push(`${id} ${r.display_name} (already hidden)`)
    else if (r.is_claimed === true || r.user_id) leave.push(`${id} ${r.display_name} (claimed since)`)
    else hide.push(id)
  }

  console.log(`Log: ${file} (${entries.length} entries)`)
  console.log(`  added artists to hide:  ${hide.length}`)
  console.log(`  left alone:             ${leave.length}`)
  for (const s of leave.slice(0, 20)) console.log(`    ${s}`)

  if (!ARGS.apply) {
    console.log("\nDry run: nothing written. Pass --apply to undo.")
    return
  }
  const undo = new UndoLog(`undo-${SCRIPT}`)
  for (let i = 0; i < hide.length; i += BATCH) {
    const batch = hide.slice(i, i + BATCH)
    undo.append(batch.map((id) => ({ table: "artists", id, field: "is_active", old_value: true, new_value: false })))
    await withRetry(`hide batch ${i / BATCH + 1}`, async () => {
      const { error } = await supabase.from("artists").update({ is_active: false }).in("id", batch).eq("is_active", true).eq("is_claimed", false)
      if (error) throw new Error(error.message)
    })
  }
  console.log(`\nHid ${hide.length} added artists.`)
  console.log(`Undo log for this undo: ${undo.file}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
