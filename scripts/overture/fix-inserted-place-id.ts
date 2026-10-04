// overture/fix-inserted-place-id.ts
// Sets place_id = 'overture:' || overture_id on shops inserted by one
// match-open-data --input-final run whose CSV had no place_id column. The
// rows are identified ONLY by that run's undo file (never by date or by
// overture_id alone — many older shops legitimately have overture_id and no
// place_id). Only rows with place_id NULL and overture_id set are touched.
// Run: npx tsx scripts/overture/fix-inserted-place-id.ts --input data/undo/match-open-data-insert-<stamp>.jsonl [--apply]

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import { parseScriptArgs } from "../lib/args"
import { getSupabaseAdmin } from "../lib/supabase-admin"
import { UndoLog, loggedUpdate, type UndoEntry } from "../lib/undo-log"
import { fetchIn, modeBanner, runPool } from "../lib/cleanup-utils"

const ARGS = parseScriptArgs()

async function main() {
  if (!ARGS.input || !/match-open-data-insert-.*\.jsonl$/.test(ARGS.input) || !fs.existsSync(ARGS.input)) {
    console.error("Usage: --input data/undo/match-open-data-insert-<stamp>.jsonl (an existing insert undo file)")
    process.exit(1)
  }
  modeBanner(ARGS.apply)

  const entries = fs
    .readFileSync(ARGS.input, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as UndoEntry)
  const ids = Array.from(
    new Set(entries.filter((e) => e.table === "shops" && e.field === "is_active" && e.new_value === true).map((e) => e.id))
  )
  console.log(`${ARGS.input}: ${entries.length} entries, ${ids.length} inserted shop ids`)

  const rows = await fetchIn(getSupabaseAdmin(), "shops", "id, name, place_id, overture_id", "id", ids)
  const todo = rows.filter((r) => r.place_id == null && r.overture_id)
  console.log(`  found in shops:              ${rows.length}`)
  console.log(`  already have place_id:       ${rows.filter((r) => r.place_id != null).length}`)
  console.log(`  no overture_id:              ${rows.filter((r) => !r.overture_id).length}`)
  console.log(`  to set place_id:             ${todo.length}`)
  for (const r of todo.slice(0, 5)) console.log(`    ${r.name}: place_id → overture:${r.overture_id}`)

  if (!ARGS.apply) {
    console.log("\nDry run — nothing written. Pass --apply to write (undo-logged).")
    return
  }
  const supabase = getSupabaseAdmin()
  const undo = new UndoLog("fix-inserted-place-id")
  let done = 0
  await runPool(todo, 10, async (r) => {
    await loggedUpdate(supabase, undo, "shops", String(r.id), r, { place_id: `overture:${r.overture_id}` })
    done++
  })
  console.log(`\nUpdated ${done} shops. Undo log: ${undo.file} (${undo.entries} entries)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
