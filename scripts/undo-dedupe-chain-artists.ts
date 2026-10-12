// undo-dedupe-chain-artists.ts
// Reverses scripts/dedupe-chain-artists.ts from its undo log: hidden copies go
// back to is_active=true and filled keeper fields get their old values.
// Run: npx tsx scripts/undo-dedupe-chain-artists.ts --input data/undo/dedupe-chain-artists-<timestamp>.jsonl [--apply]
//   Dry run by default: reports what would be restored and any row whose
//   current value no longer matches what the dedupe wrote (changed since,
//   left alone). --apply restores in batches of 500 and undo-logs its own writes.

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog, type UndoEntry } from "./lib/undo-log"
import { fetchIn, modeBanner } from "./lib/cleanup-utils"
import { withRetry } from "./lib/retry"

const ARGS = parseScriptArgs()
const BATCH = 500
const FIELDS = new Set(["is_active", "avatar_url", "instagram_handle", "bio", "website_url", "booking_url"])

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

async function main() {
  if (!ARGS.input) {
    console.error("Usage: npx tsx scripts/undo-dedupe-chain-artists.ts --input data/undo/dedupe-chain-artists-<timestamp>.jsonl [--apply]")
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
  const foreign = entries.filter((e) => e.script !== "dedupe-chain-artists" || e.table !== "artists" || !FIELDS.has(e.field))
  if (foreign.length) throw new Error(`${foreign.length} entries are not from dedupe-chain-artists on artists; refusing.`)

  const supabase = getSupabaseAdmin()
  const ids = Array.from(new Set(entries.map((e) => e.id)))
  const current = new Map(
    (
      await withRetry("fetch artists", () =>
        fetchIn(supabase, "artists", `id, ${Array.from(FIELDS).join(", ")}`, "id", ids),
      )
    ).map((r) => [String(r.id), r]),
  )

  const unhide: string[] = []
  const restores: UndoEntry[] = []
  const changedSince: UndoEntry[] = []
  for (const e of entries) {
    const row = current.get(e.id)
    if (!row || !same(row[e.field], e.new_value)) {
      changedSince.push(e)
      continue
    }
    if (e.field === "is_active") unhide.push(e.id)
    else restores.push(e)
  }

  console.log(`Log: ${file} (${entries.length} entries)`)
  console.log(`  rows to make active again:  ${unhide.length}`)
  console.log(`  keeper fields to restore:   ${restores.length}`)
  console.log(`  changed since (left alone): ${changedSince.length}`)
  for (const e of changedSince.slice(0, 20)) console.log(`    ${e.id} ${e.field}`)

  if (!ARGS.apply) {
    console.log("\nDry run: nothing written. Pass --apply to restore.")
    return
  }

  const undo = new UndoLog("undo-dedupe-chain-artists")
  for (let i = 0; i < unhide.length; i += BATCH) {
    const batch = unhide.slice(i, i + BATCH)
    undo.append(batch.map((id) => ({ table: "artists", id, field: "is_active", old_value: false, new_value: true })))
    await withRetry(`unhide batch ${i / BATCH + 1}`, async () => {
      const { error } = await supabase.from("artists").update({ is_active: true }).in("id", batch).eq("is_active", false)
      if (error) throw new Error(error.message)
    })
  }
  for (const e of restores) {
    undo.append([{ table: "artists", id: e.id, field: e.field, old_value: e.new_value, new_value: e.old_value }])
    await withRetry(`restore ${e.id} ${e.field}`, async () => {
      const { error } = await supabase.from("artists").update({ [e.field]: e.old_value }).eq("id", e.id)
      if (error) throw new Error(error.message)
    })
  }
  console.log(`\nMade ${unhide.length} artists active again and restored ${restores.length} fields.`)
  console.log(`Undo log for this undo: ${undo.file}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
