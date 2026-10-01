// undo.ts
// Restores the old values recorded in a data/undo/*.jsonl file.
// Run: npx tsx scripts/undo.ts --input data/undo/<file>.jsonl [--apply]
//   Dry-run by default: reports what would be restored and any rows whose
//   current value no longer matches what the script wrote (changed since).
//   --apply restores, and undo-logs its own writes so an undo can be undone.

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog, loggedUpdate, type UndoEntry } from "./lib/undo-log"
import { fetchIn, modeBanner, runPool } from "./lib/cleanup-utils"

const ARGS = parseScriptArgs()

async function main() {
  if (!ARGS.input) {
    console.error("Usage: npx tsx scripts/undo.ts --input data/undo/<file>.jsonl [--apply]")
    process.exit(1)
  }
  const file = path.resolve(ARGS.input)
  if (!fs.existsSync(file)) {
    console.error(`Undo file not found: ${file}`)
    process.exit(1)
  }
  modeBanner(ARGS.apply)

  const entries = fs
    .readFileSync(file, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as UndoEntry)
  console.log(`Read ${entries.length} undo entries from ${file}`)

  // Walk in reverse so that if a field was changed more than once, the value
  // restored is the oldest one (from the first write). `wrote` keeps the last
  // value the script wrote, which is what the row should hold right now.
  const restore = new Map<string, Map<string, Record<string, unknown>>>() // table → id → patch
  const wrote = new Map<string, unknown>() // table|id|field → last new_value
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i]
    if (!restore.has(e.table)) restore.set(e.table, new Map())
    const byId = restore.get(e.table)!
    if (!byId.has(e.id)) byId.set(e.id, {})
    byId.get(e.id)![e.field] = e.old_value
    const k = `${e.table}|${e.id}|${e.field}`
    if (!wrote.has(k)) wrote.set(k, e.new_value)
  }

  const supabase = getSupabaseAdmin()
  const undo = new UndoLog("undo")
  let drifted = 0
  let missing = 0
  let restored = 0

  for (const [table, byId] of Array.from(restore.entries())) {
    const ids = Array.from(byId.keys())
    const fields = Array.from(new Set(Array.from(byId.values()).flatMap((p) => Object.keys(p))))
    const current = await fetchIn(supabase, table, ["id", ...fields].join(", "), "id", ids)
    const currentById = new Map(current.map((r) => [String(r.id), r]))

    console.log(`\n${table}: ${ids.length} rows, fields: ${fields.join(", ")}`)

    const work: { id: string; row: Record<string, unknown>; patch: Record<string, unknown> }[] = []
    for (const [id, patch] of Array.from(byId.entries())) {
      const row = currentById.get(id)
      if (!row) {
        missing++
        console.log(`  MISSING ${table} ${id} — row no longer exists, skipped`)
        continue
      }
      for (const field of Object.keys(patch)) {
        const expected = wrote.get(`${table}|${id}|${field}`)
        if (JSON.stringify(row[field] ?? null) !== JSON.stringify(expected ?? null)) {
          drifted++
          if (drifted <= 20)
            console.log(`  DRIFT ${table} ${id}.${field}: now ${JSON.stringify(row[field])}, script wrote ${JSON.stringify(expected)} — will still restore`)
        }
      }
      work.push({ id, row, patch })
    }

    if (ARGS.apply) {
      await runPool(work, 10, async (w) => {
        await loggedUpdate(supabase, undo, table, w.id, w.row, w.patch)
        restored++
      })
    } else {
      restored += work.length
    }
  }

  console.log(`\n── Summary ──`)
  console.log(`Rows ${ARGS.apply ? "restored" : "that would be restored"}: ${restored}`)
  console.log(`Fields changed since the script ran (drift): ${drifted}`)
  console.log(`Rows missing: ${missing}`)
  if (ARGS.apply && undo.entries > 0) console.log(`Undo log for this restore: ${undo.file}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
