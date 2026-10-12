// undo-rehome-chain-artists.ts
// Reverses scripts/rehome-chain-artists.ts from its undo log: the copies it
// made active are hidden again, the keepers it hid are made active again, and
// any fields it copied get their old values.
// Run: npx tsx scripts/undo-rehome-chain-artists.ts --input data/undo/rehome-chain-artists-<timestamp>.jsonl [--apply]
//   Dry run by default: reports what would be restored and any row whose
//   current value no longer matches what the rehome wrote (changed since, left
//   alone). --apply restores in batches of 500 and undo-logs its own writes.

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog, type UndoEntry } from "./lib/undo-log"
import { fetchIn, modeBanner } from "./lib/cleanup-utils"
import { withRetry } from "./lib/retry"
import { FILL_FIELDS } from "./lib/chain-artists"

const ARGS = parseScriptArgs()
const BATCH = 500
const FIELDS = new Set<string>(["is_active", ...FILL_FIELDS])

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

async function main() {
  if (!ARGS.input) {
    console.error("Usage: npx tsx scripts/undo-rehome-chain-artists.ts --input data/undo/rehome-chain-artists-<timestamp>.jsonl [--apply]")
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
  const foreign = entries.filter((e) => e.script !== "rehome-chain-artists" || e.table !== "artists" || !FIELDS.has(e.field))
  if (foreign.length) throw new Error(`${foreign.length} entries are not from rehome-chain-artists on artists; refusing.`)

  const supabase = getSupabaseAdmin()
  const ids = Array.from(new Set(entries.map((e) => e.id)))
  const current = new Map(
    (await withRetry("fetch artists", () => fetchIn(supabase, "artists", `id, ${Array.from(FIELDS).join(", ")}`, "id", ids))).map(
      (r) => [String(r.id), r],
    ),
  )

  const reactivate: string[] = []
  const rehide: string[] = []
  const restores: UndoEntry[] = []
  const changedSince: UndoEntry[] = []
  for (const e of entries) {
    const row = current.get(e.id)
    if (!row || !same(row[e.field], e.new_value)) {
      changedSince.push(e)
      continue
    }
    if (e.field !== "is_active") restores.push(e)
    else if (e.old_value === true) reactivate.push(e.id)
    else rehide.push(e.id)
  }

  console.log(`Log: ${file} (${entries.length} entries)`)
  console.log(`  keepers to make active again: ${reactivate.length}`)
  console.log(`  copies to hide again:         ${rehide.length}`)
  console.log(`  fields to restore:            ${restores.length}`)
  console.log(`  changed since (left alone):   ${changedSince.length}`)
  for (const e of changedSince.slice(0, 20)) console.log(`    ${e.id} ${e.field}`)

  if (!ARGS.apply) {
    console.log("\nDry run: nothing written. Pass --apply to restore.")
    return
  }

  const undo = new UndoLog("undo-rehome-chain-artists")
  const setActive = async (list: string[], value: boolean) => {
    for (let i = 0; i < list.length; i += BATCH) {
      const batch = list.slice(i, i + BATCH)
      undo.append(batch.map((id) => ({ table: "artists", id, field: "is_active", old_value: !value, new_value: value })))
      await withRetry(`set is_active=${value} batch ${i / BATCH + 1}`, async () => {
        const { error } = await supabase.from("artists").update({ is_active: value }).in("id", batch).eq("is_active", !value)
        if (error) throw new Error(error.message)
      })
    }
  }
  await setActive(reactivate, true)
  for (const e of restores) {
    undo.append([{ table: "artists", id: e.id, field: e.field, old_value: e.new_value, new_value: e.old_value }])
    await withRetry(`restore ${e.id} ${e.field}`, async () => {
      const { error } = await supabase.from("artists").update({ [e.field]: e.old_value }).eq("id", e.id)
      if (error) throw new Error(error.message)
    })
  }
  await setActive(rehide, false)
  console.log(`\nMade ${reactivate.length} keepers active again, hid ${rehide.length} copies, restored ${restores.length} fields.`)
  console.log(`Undo log for this undo: ${undo.file}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
