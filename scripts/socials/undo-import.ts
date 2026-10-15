// scripts/socials/undo-import.ts
// Reverses scripts/socials/import.ts from its undo log: artists it added go to
// is_active=false (never deleted), and every field it filled gets its old value.
// Run: npx tsx scripts/socials/undo-import.ts --input data/undo/shop-socials-import-<timestamp>.jsonl [--apply]
//   Dry run by default: reports what would be undone and any row whose current
//   value no longer matches what the import wrote (changed since, left alone).
//   --apply undoes in batches of 500 and undo-logs its own writes.

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
const BATCH = 500
const FIELDS: Record<string, Set<string>> = {
  artists: new Set(["is_active", "instagram_handle"]),
  shops: new Set(["instagram_url", "facebook_url", "tiktok_url", "youtube_url", "instagram_followers", "instagram_checked_at", "website_status", "website_checked_at"]),
}

// Timestamps come back from Postgres as "+00:00", the log has "Z".
const norm = (v: unknown) => (typeof v === "string" && /^\d{4}-\d\d-\d\dT/.test(v) ? new Date(v).toISOString() : v ?? null)
const same = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b))

async function main() {
  if (!ARGS.input) {
    console.error("Usage: npx tsx scripts/socials/undo-import.ts --input data/undo/shop-socials-import-<timestamp>.jsonl [--apply]")
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
  const foreign = entries.filter((e) => e.script !== "shop-socials-import" || !FIELDS[e.table]?.has(e.field))
  if (foreign.length) throw new Error(`${foreign.length} entries are not from shop-socials-import; refusing.`)

  const supabase = getSupabaseAdmin()
  const hide: string[] = []
  const restores: UndoEntry[] = []
  const changedSince: UndoEntry[] = []
  for (const table of Object.keys(FIELDS)) {
    const mine = entries.filter((e) => e.table === table)
    if (!mine.length) continue
    const ids = Array.from(new Set(mine.map((e) => e.id)))
    const current = new Map(
      (await withRetry(`fetch ${table}`, () => fetchIn(supabase, table, `id, ${Array.from(FIELDS[table]).join(", ")}`, "id", ids))).map((r) => [String(r.id), r]),
    )
    for (const e of mine) {
      const row = current.get(e.id)
      if (!row || !same(row[e.field], e.new_value)) {
        changedSince.push(e)
        continue
      }
      if (e.field === "is_active") hide.push(e.id)
      else restores.push(e)
    }
  }

  console.log(`Log: ${file} (${entries.length} entries)`)
  console.log(`  added artists to hide:      ${hide.length}`)
  console.log(`  filled fields to restore:   ${restores.length} (artists ${restores.filter((e) => e.table === "artists").length}, shops ${restores.filter((e) => e.table === "shops").length})`)
  console.log(`  changed since (left alone): ${changedSince.length}`)
  for (const e of changedSince.slice(0, 20)) console.log(`    ${e.table} ${e.id} ${e.field}`)

  if (!ARGS.apply) {
    console.log("\nDry run: nothing written. Pass --apply to undo.")
    return
  }

  const undo = new UndoLog("undo-shop-socials-import")
  for (let i = 0; i < hide.length; i += BATCH) {
    const batch = hide.slice(i, i + BATCH)
    undo.append(batch.map((id) => ({ table: "artists", id, field: "is_active", old_value: true, new_value: false })))
    await withRetry(`hide batch ${i / BATCH + 1}`, async () => {
      const { error } = await supabase.from("artists").update({ is_active: false }).in("id", batch).eq("is_active", true)
      if (error) throw new Error(error.message)
    })
  }
  for (let i = 0; i < restores.length; i += BATCH) {
    const batch = restores.slice(i, i + BATCH)
    undo.append(batch.map((e) => ({ table: e.table, id: e.id, field: e.field, old_value: e.new_value, new_value: e.old_value })))
    await runPool(batch, 10, async (e) => {
      await withRetry(`restore ${e.table} ${e.id} ${e.field}`, async () => {
        const { error } = await supabase.from(e.table).update({ [e.field]: e.old_value }).eq("id", e.id)
        if (error) throw new Error(error.message)
      })
    })
  }
  console.log(`\nHid ${hide.length} added artists and restored ${restores.length} fields.`)
  console.log(`Undo log for this undo: ${undo.file}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
