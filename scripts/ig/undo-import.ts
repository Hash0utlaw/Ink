// scripts/ig/undo-import.ts
// Reverses scripts/ig/import.ts from its undo log: instagram_followers and
// instagram_checked_at get their old values back (null where they were empty),
// and a cleared wrong-account handle (artists.instagram_handle /
// shops.instagram_url) gets its old value back.
// Run: npx tsx scripts/ig/undo-import.ts --input data/undo/ig-followers-import-<timestamp>.jsonl [--apply]
//   Dry run by default: reports what would be undone and any row whose current
//   value no longer matches what the import wrote (changed since, left alone).
//   --apply undoes and undo-logs its own writes.

import { config } from "dotenv"
config({ path: ".env.local", quiet: true })

import fs from "fs"
import path from "path"
import { parseScriptArgs } from "../lib/args"
import { getSupabaseAdmin } from "../lib/supabase-admin"
import { UndoLog, type UndoEntry } from "../lib/undo-log"
import { fetchIn, modeBanner, runPool } from "../lib/cleanup-utils"
import { withRetry } from "../lib/retry"

const ARGS = parseScriptArgs()
const SCRIPT = "ig-followers-import"
const TABLES = new Set(["artists", "shops"])
const FIELDS = new Set(["instagram_followers", "instagram_checked_at", "instagram_handle", "instagram_url"])
const HANDLE_FIELD: Record<string, string> = { artists: "instagram_handle", shops: "instagram_url" }

// Timestamps come back from Postgres as "+00:00", the log has "Z".
const norm = (v: unknown) => (typeof v === "string" && /^\d{4}-\d\d-\d\dT/.test(v) ? new Date(v).toISOString() : v ?? null)
const same = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b))

async function main() {
  if (!ARGS.input) {
    console.error("Usage: npx tsx scripts/ig/undo-import.ts --input data/undo/ig-followers-import-<timestamp>.jsonl [--apply]")
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
  const foreign = entries.filter((e) => e.script !== SCRIPT || !TABLES.has(e.table) || !FIELDS.has(e.field))
  if (foreign.length) throw new Error(`${foreign.length} entries are not from ${SCRIPT}; refusing.`)

  // A row is restored only if every logged field still holds what the import wrote.
  const supabase = getSupabaseAdmin()
  const restores: { table: string; id: string; patch: Record<string, unknown>; entries: UndoEntry[] }[] = []
  const changedSince: string[] = []
  for (const table of TABLES) {
    const mine = entries.filter((e) => e.table === table)
    if (!mine.length) continue
    const byId = new Map<string, UndoEntry[]>()
    for (const e of mine) byId.set(e.id, [...(byId.get(e.id) ?? []), e])
    const current = new Map(
      (await withRetry(`fetch ${table}`, () => fetchIn(supabase, table, `id, instagram_followers, instagram_checked_at, ${HANDLE_FIELD[table]}`, "id", Array.from(byId.keys())))).map((r) => [String(r.id), r]),
    )
    for (const [id, es] of byId) {
      const row = current.get(id)
      if (!row || es.some((e) => !same(row[e.field], e.new_value))) {
        changedSince.push(`${table} ${id}`)
        continue
      }
      restores.push({ table, id, patch: Object.fromEntries(es.map((e) => [e.field, e.old_value ?? null])), entries: es })
    }
  }

  console.log(`Log: ${file} (${entries.length} entries)`)
  console.log(`  rows to restore:            ${restores.length} (artists ${restores.filter((r) => r.table === "artists").length}, shops ${restores.filter((r) => r.table === "shops").length})`)
  console.log(`  changed since (left alone): ${changedSince.length}`)
  for (const s of changedSince.slice(0, 20)) console.log(`    ${s}`)

  if (!ARGS.apply) {
    console.log("\nDry run: nothing written. Pass --apply to undo.")
    return
  }

  const undo = new UndoLog(`undo-${SCRIPT}`)
  await runPool(restores, 10, async (r) => {
    undo.append(r.entries.map((e) => ({ table: e.table, id: e.id, field: e.field, old_value: e.new_value, new_value: e.old_value ?? null })))
    await withRetry(`restore ${r.table} ${r.id}`, async () => {
      const { error } = await supabase.from(r.table).update(r.patch).eq("id", r.id)
      if (error) throw new Error(error.message)
    })
  })
  console.log(`\nRestored ${restores.length} rows.`)
  console.log(`Undo log for this undo: ${undo.file}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
