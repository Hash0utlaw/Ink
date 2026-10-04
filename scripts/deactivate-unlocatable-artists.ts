// deactivate-unlocatable-artists.ts
// Deactivates active artists that can't be shown correctly:
//   - city or state is null/blank (copied from a shop with a broken address), or
//   - their shop is inactive or possibly_closed.
// Never deletes and never changes shops. Writes data/artists-missing-location.csv
// (one row per shop behind the missing-location artists) for the later
// shop-address fix.
// Run: npx tsx scripts/deactivate-unlocatable-artists.ts [--apply]
//   Dry-run by default; --apply sets is_active=false, undo-logged.

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog, loggedUpdate } from "./lib/undo-log"
import { fetchAll, fetchIn, modeBanner, parseCSV, runPool, writeCsv } from "./lib/cleanup-utils"
import { withRetry } from "./lib/retry"

const ARGS = parseScriptArgs()
const OUT = "data/artists-missing-location.csv"
const NON_TATTOO = "data/non-tattoo-deactivate-proposed.csv"

const blank = (v: unknown) => v == null || String(v).trim() === ""

async function main() {
  modeBanner(ARGS.apply)
  const supabase = getSupabaseAdmin()

  const artists = await withRetry("fetch artists", () =>
    fetchAll(supabase, "artists", "id, display_name, handle, shop_id, city, state, source, is_active", (q) => q.eq("is_active", true))
  )
  const shopIds = Array.from(new Set(artists.map((a) => a.shop_id).filter(Boolean).map(String)))
  const shops = await withRetry("fetch shops", () =>
    fetchIn(supabase, "shops", "id, name, address, city, state, zip, latitude, longitude, is_active, possibly_closed", "id", shopIds)
  )
  const shopById = new Map(shops.map((s) => [String(s.id), s]))

  const noLocation = artists.filter((a) => blank(a.city) || blank(a.state))
  const badShop = artists.filter((a) => {
    const s = a.shop_id ? shopById.get(String(a.shop_id)) : null
    return s != null && (!s.is_active || s.possibly_closed === true)
  })
  const targets = new Map<string, Record<string, unknown>>()
  for (const a of [...noLocation, ...badShop]) targets.set(String(a.id), a)

  console.log(`Active artists: ${artists.length}`)
  console.log(`  null/blank city or state:            ${noLocation.length} (no state ${noLocation.filter((a) => blank(a.state)).length}, no city ${noLocation.filter((a) => blank(a.city)).length})`)
  console.log(`    from this week's promote:          ${noLocation.filter((a) => a.source === "shop_artists").length} source=shop_artists`)
  console.log(`  at inactive or possibly_closed shop: ${badShop.length}`)
  for (const a of badShop) console.log(`    ${a.display_name} at ${shopById.get(String(a.shop_id))?.name}`)
  console.log(`  to deactivate (distinct):            ${targets.size}`)

  // Address-fix list: one row per shop behind the missing-location artists.
  const nonTattoo = fs.existsSync(NON_TATTOO) ? new Set(parseCSV(fs.readFileSync(NON_TATTOO, "utf-8")).map((r) => r.id)) : new Set<string>()
  const perShop = new Map<string, number>()
  for (const a of noLocation) {
    const k = a.shop_id ? String(a.shop_id) : ""
    perShop.set(k, (perShop.get(k) ?? 0) + 1)
  }
  const rows = Array.from(perShop.entries()).map(([id, n]) => {
    const s = shopById.get(id)
    return {
      shop_id: id,
      shop_name: s?.name ?? "",
      address: s?.address ?? "",
      city: s?.city ?? "",
      state: s?.state ?? "",
      zip: s?.zip ?? "",
      has_coordinates: s && Number(s.latitude) && Number(s.longitude) ? "y" : "n",
      artists_deactivated: n,
      in_non_tattoo_proposal: nonTattoo.has(id) ? "y" : "n",
    }
  })
  writeCsv(OUT, ["shop_id", "shop_name", "address", "city", "state", "zip", "has_coordinates", "artists_deactivated", "in_non_tattoo_proposal"], rows)
  console.log(`\nWrote ${OUT}: ${rows.length} shops (${rows.filter((r) => r.has_coordinates === "y").length} with coordinates, ${rows.filter((r) => r.in_non_tattoo_proposal === "y").length} in the non-tattoo proposal)`)

  if (!ARGS.apply) {
    console.log("\nDry run — nothing written. Pass --apply to write (undo-logged).")
    return
  }
  const undo = new UndoLog("deactivate-unlocatable-artists")
  let done = 0
  await runPool(Array.from(targets.values()), 10, async (a) => {
    await withRetry(`deactivate ${a.id}`, () => loggedUpdate(supabase, undo, "artists", String(a.id), a, { is_active: false }))
    done++
  })
  console.log(`\nDeactivated ${done} artists. Undo log: ${undo.file} (${undo.entries} entries)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
