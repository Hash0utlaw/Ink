// hide-unlocatable-shops.ts
// Hides (is_active = false) active shops that can't be placed anywhere: no
// state, no ZIP, and no coordinates. Never deletes and changes only is_active.
// A shop is kept (excluded) if anything depends on it: a claimed owner, an
// active artist linked by artists.shop_id, a booking request, a claim request
// or claim link, or a user's saved item.
//
// Run: npx tsx scripts/hide-unlocatable-shops.ts [--output <dir>]
//        Dry run (default): prints counts and writes hide.csv, excluded.csv
//        and plan.json to --output (default data/hide-unlocatable-shops).
//      npx tsx scripts/hide-unlocatable-shops.ts --apply --input <dir>/plan.json
//        Re-selects and stops unless the rows match plan.json exactly, then
//        writes and undo-logs each change (data/undo/hide-unlocatable-shops-*.jsonl).
//        Restore with: npx tsx scripts/undo.ts --input <undo file> [--apply]

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import type { SupabaseClient } from "@supabase/supabase-js"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog } from "./lib/undo-log"
import { fetchAll, fetchIn, modeBanner, runPool, writeCsv } from "./lib/cleanup-utils"

const ARGS = parseScriptArgs()
const SCRIPT = "hide-unlocatable-shops"

interface ShopRow {
  id: string
  name: string | null
  address: string | null
  city: string | null
  phone: string | null
  state: string | null
  zip: string | null
  latitude: number | null
  longitude: number | null
  owner_user_id: string | null
}

const blank = (v: unknown) => v == null || String(v).trim() === ""

async function selectCandidates(supabase: SupabaseClient): Promise<ShopRow[]> {
  const shops = await fetchAll<ShopRow>(
    supabase,
    "shops",
    "id, name, address, city, phone, state, zip, latitude, longitude, owner_user_id",
    (q) => q.eq("is_active", true).or("state.is.null,state.eq.,state.eq. ")
  )
  return shops.filter((s) => blank(s.state) && blank(s.zip) && (s.latitude == null || s.longitude == null))
}

// shop id → reasons it must stay active.
async function dependencies(supabase: SupabaseClient, shops: ShopRow[]): Promise<Map<string, string[]>> {
  const ids = shops.map((s) => s.id)
  const reasons = new Map<string, string[]>()
  const add = (id: string, why: string) => reasons.set(id, [...(reasons.get(id) ?? []), why])

  for (const s of shops) if (s.owner_user_id) add(s.id, "claimed owner")

  const count = (rows: Record<string, unknown>[], key: string) => {
    const n = new Map<string, number>()
    for (const r of rows) n.set(String(r[key]), (n.get(String(r[key])) ?? 0) + 1)
    return n
  }
  const checks: [string, string, string, string][] = [
    // [table, columns, id column, label]
    ["artists", "id, shop_id, is_active", "shop_id", "active artist"],
    ["booking_requests", "id, shop_id", "shop_id", "booking request"],
    ["claim_requests", "id, shop_id", "shop_id", "claim request"],
    ["claim_links", "id, shop_id", "shop_id", "claim link"],
  ]
  for (const [table, columns, col, label] of checks) {
    let rows = await fetchIn(supabase, table, columns, col, ids)
    if (table === "artists") rows = rows.filter((r) => r.is_active === true)
    for (const [id, n] of Array.from(count(rows, col))) add(id, `${n} ${label}${n > 1 ? "s" : ""}`)
  }
  const saved = (await fetchIn(supabase, "saved_items", "id, item_id, item_type", "item_id", ids)).filter((r) => r.item_type === "shop")
  for (const [id, n] of Array.from(count(saved, "item_id"))) add(id, `saved by ${n} user${n > 1 ? "s" : ""}`)
  return reasons
}

async function activeShopCount(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase.from("shops").select("id", { count: "exact", head: true }).eq("is_active", true)
  if (error) throw new Error(`count failed: ${error.message}`)
  return count ?? 0
}

async function main() {
  modeBanner(ARGS.apply)
  const supabase = getSupabaseAdmin()

  const candidates = await selectCandidates(supabase)
  const reasons = await dependencies(supabase, candidates)
  const excluded = candidates.filter((s) => reasons.has(s.id))
  const hide = candidates.filter((s) => !reasons.has(s.id))

  // Stub artists (shop_artists rows) go with the shop and are hidden with it; reported, not a reason to keep.
  const stubs = await fetchIn(supabase, "shop_artists", "id, shop_id", "shop_id", hide.map((s) => s.id))

  console.log(`Active shops with no state, no ZIP and no coordinates: ${candidates.length}`)
  console.log(`Excluded (something depends on them): ${excluded.length}`)
  for (const s of excluded) console.log(`  ${s.id}  ${s.name}  ${reasons.get(s.id)!.join(", ")}`)
  console.log(`To hide: ${hide.length}`)
  console.log(`  (${stubs.length} shop_artists stub rows belong to these shops; they only show on the shop's own page)`)

  if (!ARGS.apply) {
    const dir = path.resolve(ARGS.output ?? "data/hide-unlocatable-shops")
    const csv = writeCsv(path.join(dir, "hide.csv"), ["id", "name", "address", "city", "phone"], hide as unknown as Record<string, unknown>[])
    writeCsv(
      path.join(dir, "excluded.csv"),
      ["id", "name", "reasons"],
      excluded.map((s) => ({ id: s.id, name: s.name, reasons: reasons.get(s.id)!.join("; ") }))
    )
    fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(hide.map((s) => s.id), null, 1))
    console.log(`\nCSV: ${csv}`)
    console.log(`Excluded CSV: ${path.join(dir, "excluded.csv")}`)
    console.log(`Plan for --apply: ${path.join(dir, "plan.json")}`)
    return
  }

  // ── Apply ──
  if (!ARGS.input) {
    console.error("--apply needs --input <plan.json> from the dry run.")
    process.exit(1)
  }
  const expected = (JSON.parse(fs.readFileSync(path.resolve(ARGS.input), "utf-8")) as string[]).sort()
  const current = hide.map((s) => s.id).sort()
  if (expected.length !== current.length || expected.join() !== current.join()) {
    console.error(`STOP: the rows changed since the dry run (dry run ${expected.length}, now ${current.length}). Nothing written.`)
    process.exit(1)
  }

  const before = await activeShopCount(supabase)
  const undo = new UndoLog(SCRIPT)
  let updated = 0
  const notUpdated: string[] = []
  await runPool(hide, 10, async (s) => {
    undo.append([{ table: "shops", id: s.id, field: "is_active", old_value: true, new_value: false }])
    // Guarded: only while still active, unclaimed and unlocatable.
    const { data, error } = await supabase
      .from("shops")
      .update({ is_active: false })
      .eq("id", s.id)
      .eq("is_active", true)
      .is("owner_user_id", null)
      .or("latitude.is.null,longitude.is.null")
      .select("id")
    if (error) throw new Error(`update ${s.id} failed: ${error.message}`)
    if (data && data.length === 1) updated++
    else notUpdated.push(s.id)
  })
  const after = await activeShopCount(supabase)

  console.log(`\n── Applied ──`)
  console.log(`Hidden: ${updated} of ${hide.length}`)
  if (notUpdated.length) console.log(`Not updated (changed since the dry run): ${notUpdated.join(", ")}`)
  console.log(`Undo log: ${undo.file}`)
  console.log(`Undo: npx tsx scripts/undo.ts --input ${path.relative(process.cwd(), undo.file)} [--apply]`)
  console.log(`Active shops: before ${before}, after ${after}, dropped ${before - after}`)
  console.log(before - after === updated ? "OK: dropped by exactly the hidden count." : "MISMATCH: the drop doesn't equal the hidden count.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
