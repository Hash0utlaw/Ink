// undo.ts
// Restores the old values recorded in a data/undo/*.jsonl file.
// Run: npx tsx scripts/undo.ts --input data/undo/<file>.jsonl [--apply]
//   Dry-run by default: reports what would be restored and any rows whose
//   current value no longer matches what the script wrote (changed since).
//   --apply restores, and undo-logs its own writes so an undo can be undone.
//   Inserted rows (op "insert") are deleted — the one place a script deletes —
//   and only for DELETABLE_INSERTS below (shop_artists rows from
//   scrape-shop-artists.ts, shop_styles rows from normalize-styles.ts).
//   Any other insert entry stops the run.

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog, loggedUpdate, type UndoEntry } from "./lib/undo-log"
import { fetchIn, modeBanner, runPool } from "./lib/cleanup-utils"

const ARGS = parseScriptArgs()

// script → table whose rows that script inserted and undo may delete.
const DELETABLE_INSERTS: Record<string, string> = {
  "scrape-shop-artists": "shop_artists",
  "normalize-styles": "shop_styles",
}

// Tables without an id column: their insert entries carry the whole row in
// new_value, and rows are matched on these key columns instead of id.
const COMPOSITE_KEYS: Record<string, string[]> = { shop_styles: ["shop_id", "style"] }

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

  const all = fs
    .readFileSync(file, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as UndoEntry)
  console.log(`Read ${all.length} undo entries from ${file}`)

  const inserts = all.filter((e) => e.op === "insert")
  // "__deleted__" lines record rows a previous undo deleted; they can't be replayed.
  const deletedRecords = all.filter((e) => e.field === "__deleted__").length
  if (deletedRecords > 0) console.log(`  ${deletedRecords} deleted-row records skipped (can't be re-inserted by undo)`)
  const entries = all.filter((e) => e.op !== "insert" && e.op !== "note" && e.field !== "__deleted__")
  for (const e of inserts) {
    if (DELETABLE_INSERTS[e.script] !== e.table) {
      console.error(`Refusing: insert entry for ${e.table} from ${e.script} — undo only deletes rows listed in DELETABLE_INSERTS.`)
      process.exit(1)
    }
  }

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

  // Inserted rows: delete those that still exist.
  let deleted = 0
  const insertsByTable = new Map<string, string[]>()
  for (const e of inserts) insertsByTable.set(e.table, [...(insertsByTable.get(e.table) ?? []), e.id])
  for (const table of Object.keys(COMPOSITE_KEYS)) {
    const keys = COMPOSITE_KEYS[table]
    const rows = inserts.filter((e) => e.table === table).map((e) => e.new_value as Record<string, unknown>)
    if (rows.length === 0) continue
    insertsByTable.delete(table)
    let present = 0
    for (const row of rows) {
      const match = Object.fromEntries(keys.map((k) => [k, row[k]]))
      const { data, error } = await supabase.from(table).select(keys.join(", ")).match(match).limit(1)
      if (error) throw new Error(`check ${table} failed: ${error.message}`)
      if (!data || data.length === 0) {
        missing++
        continue
      }
      present++
      if (!ARGS.apply) continue
      undo.append([{ table, id: keys.map((k) => String(row[k])).join("|"), field: "__deleted__", old_value: row, new_value: null }])
      const del = await supabase.from(table).delete().match(match)
      if (del.error) throw new Error(`delete ${table} failed: ${del.error.message}`)
    }
    console.log(`\n${table}: ${rows.length} inserted rows, ${present} still exist`)
    deleted += present
  }
  for (const [table, ids] of Array.from(insertsByTable.entries())) {
    const existing = await fetchIn(supabase, table, "*", "id", ids)
    missing += ids.length - existing.length
    console.log(`\n${table}: ${ids.length} inserted rows, ${existing.length} still exist`)
    if (!ARGS.apply) {
      deleted += existing.length
      continue
    }
    for (let i = 0; i < existing.length; i += 200) {
      const chunk = existing.slice(i, i + 200)
      // Logged for the record only — undo.ts can't re-insert deleted rows.
      undo.append(chunk.map((r) => ({ table, id: String(r.id), field: "__deleted__", old_value: r, new_value: null })))
      const { error } = await supabase.from(table).delete().in("id", chunk.map((r) => String(r.id)))
      if (error) throw new Error(`delete ${table} failed: ${error.message}`)
      deleted += chunk.length
    }
  }

  console.log(`\n── Summary ──`)
  console.log(`Rows ${ARGS.apply ? "restored" : "that would be restored"}: ${restored}`)
  console.log(`Fields changed since the script ran (drift): ${drifted}`)
  if (inserts.length > 0) console.log(`Inserted rows ${ARGS.apply ? "deleted" : "that would be deleted"}: ${deleted}`)
  console.log(`Rows missing: ${missing}`)
  if (ARGS.apply && undo.entries > 0) console.log(`Undo log for this restore: ${undo.file}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
