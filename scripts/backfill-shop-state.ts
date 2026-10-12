// backfill-shop-state.ts
// Fills in shops.state for active shops where it is null or empty. Writes ONLY
// the state column, ONLY on rows where it is still null/empty (guarded in the
// WHERE clause), and never deletes anything.
//
// For each shop the state comes from the first confident method:
//   a. address text: a 2-letter state code right before a 5-digit ZIP
//      ("..., Tampa, FL 33618")
//   b. ZIP column: the state for the ZIP's 3-digit prefix (static table below)
//   c. lat/lng: inside exactly one state's bounding box, at least 0.2° from
//      every other state's box and 0.2° inside its own
// Every method that gives an answer is computed; if any two disagree, or none
// is confident, the shop is left alone.
//
// Run: npx tsx scripts/backfill-shop-state.ts [--output <dir>]
//        Dry run (default): prints the summary and writes plan.csv and
//        plan.json to --output (default data/backfill-shop-state).
//      npx tsx scripts/backfill-shop-state.ts --apply --input <dir>/plan.json
//        Re-computes the plan and stops unless it matches plan.json exactly,
//        then writes and undo-logs every change (data/undo/backfill-shop-state-*.jsonl).
//        Restore with: npx tsx scripts/undo.ts --input <undo file> [--apply]

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog } from "./lib/undo-log"
import { fetchAll, modeBanner, runPool, writeCsv } from "./lib/cleanup-utils"
import { US_STATES_PLUS_DC } from "./lib/audit"

const ARGS = parseScriptArgs()
const SCRIPT = "backfill-shop-state"
const BORDER_MARGIN = 0.2 // degrees

interface ShopRow {
  id: string
  name: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  latitude: number | null
  longitude: number | null
}

type Method = "address" | "zip" | "latlng"

interface PlanRow {
  id: string
  name: string
  address: string
  city: string
  old_state: string | null
  new_state: string
  method: Method
  city_mismatch: string
}

// ── a. Address text ──────────────────────────────────────────────────────────

// The last "XX 12345" (or "XX 12345-6789") in the address, XX a real state code.
function stateFromAddress(address: string | null): string | null {
  if (!address) return null
  const matches = Array.from(address.matchAll(/(?:^|[\s,])([A-Z]{2})\s+(\d{5})(?:-\d{4})?\b/g))
  for (let i = matches.length - 1; i >= 0; i--) {
    const code = matches[i][1]
    if (US_STATES_PLUS_DC.has(code)) return code
  }
  return null
}

// ── b. ZIP prefix ────────────────────────────────────────────────────────────

// [first 3-digit prefix, last prefix, state]. Prefixes not listed (Puerto Rico,
// Virgin Islands, Guam, military APO/FPO, unassigned) give no state. Prefixes
// that sit inside another state's range are listed on their own.
const ZIP_RANGES: [number, number, string][] = [
  [5, 5, "NY"], [10, 27, "MA"], [28, 29, "RI"], [30, 38, "NH"], [39, 49, "ME"],
  [50, 54, "VT"], [56, 59, "VT"], [60, 69, "CT"], [70, 89, "NJ"],
  [100, 149, "NY"], [150, 196, "PA"], [197, 199, "DE"], [200, 200, "DC"], [201, 201, "VA"],
  [202, 205, "DC"], [206, 219, "MD"], [220, 246, "VA"], [247, 268, "WV"], [270, 289, "NC"],
  [290, 299, "SC"], [300, 319, "GA"], [320, 339, "FL"], [341, 349, "FL"], [350, 369, "AL"],
  [370, 385, "TN"], [386, 397, "MS"], [398, 399, "GA"], [400, 427, "KY"], [430, 458, "OH"],
  [460, 479, "IN"], [480, 499, "MI"], [500, 528, "IA"], [530, 549, "WI"], [550, 567, "MN"],
  [569, 569, "DC"], [570, 577, "SD"], [580, 588, "ND"], [590, 599, "MT"], [600, 629, "IL"],
  [630, 658, "MO"], [660, 679, "KS"], [680, 693, "NE"], [700, 714, "LA"], [716, 729, "AR"],
  [730, 732, "OK"], [733, 733, "TX"], [734, 749, "OK"], [750, 799, "TX"], [800, 816, "CO"],
  [820, 831, "WY"], [832, 838, "ID"], [840, 847, "UT"], [850, 865, "AZ"], [870, 884, "NM"],
  [885, 885, "TX"], [889, 898, "NV"], [900, 961, "CA"], [967, 968, "HI"], [970, 979, "OR"],
  [980, 994, "WA"], [995, 999, "AK"],
]
// 055 (Andover, MA IRS ZIPs inside Vermont's range) is deliberately left out.

function fiveDigitZip(raw: string | null): string | null {
  const m = (raw ?? "").trim().match(/^(\d{5})(?:-\d{4})?$/)
  return m ? m[1] : null
}

function stateFromZip(zip: string | null): string | null {
  if (!zip) return null
  const prefix = parseInt(zip.slice(0, 3), 10)
  const hit = ZIP_RANGES.find(([lo, hi]) => prefix >= lo && prefix <= hi)
  return hit ? hit[2] : null
}

// ── c. Lat/lng bounding boxes ────────────────────────────────────────────────

// [minLat, maxLat, minLng, maxLng]. Each box contains its whole state, so a
// point that is inside one box and clear of every other box (by the margin)
// can't be in any other state.
const STATE_BOXES: Record<string, [number, number, number, number]> = {
  AL: [30.14, 35.01, -88.47, -84.89], AK: [51.2, 71.4, -179.15, -129.98], AZ: [31.33, 37.0, -114.82, -109.04],
  AR: [33.0, 36.5, -94.62, -89.64], CA: [32.53, 42.01, -124.41, -114.13], CO: [36.99, 41.0, -109.06, -102.04],
  CT: [40.98, 42.05, -73.73, -71.79], DE: [38.45, 39.84, -75.79, -75.05], DC: [38.79, 39.0, -77.12, -76.91],
  FL: [24.4, 31.0, -87.63, -80.03], GA: [30.36, 35.0, -85.61, -80.84], HI: [18.91, 22.24, -160.25, -154.81],
  ID: [41.99, 49.0, -117.24, -111.04], IL: [36.97, 42.51, -91.51, -87.02], IN: [37.77, 41.76, -88.1, -84.78],
  IA: [40.38, 43.5, -96.64, -90.14], KS: [36.99, 40.0, -102.05, -94.59], KY: [36.5, 39.15, -89.57, -81.96],
  LA: [28.93, 33.02, -94.04, -88.82], ME: [43.06, 47.46, -71.08, -66.95], MD: [37.91, 39.72, -79.49, -75.05],
  MA: [41.24, 42.89, -73.51, -69.93], MI: [41.7, 48.31, -90.42, -82.41], MN: [43.5, 49.38, -97.24, -89.49],
  MS: [30.17, 35.0, -91.66, -88.1], MO: [35.99, 40.61, -95.77, -89.1], MT: [44.36, 49.0, -116.05, -104.04],
  NE: [40.0, 43.0, -104.05, -95.31], NV: [35.0, 42.0, -120.01, -114.04], NH: [42.7, 45.31, -72.56, -70.61],
  NJ: [38.93, 41.36, -75.56, -73.89], NM: [31.33, 37.0, -109.05, -103.0], NY: [40.5, 45.02, -79.76, -71.86],
  NC: [33.84, 36.59, -84.32, -75.46], ND: [45.94, 49.0, -104.05, -96.55], OH: [38.4, 41.98, -84.82, -80.52],
  OK: [33.62, 37.0, -103.0, -94.43], OR: [41.99, 46.29, -124.57, -116.46], PA: [39.72, 42.27, -80.52, -74.69],
  RI: [41.15, 42.02, -71.86, -71.12], SC: [32.03, 35.22, -83.35, -78.54], SD: [42.48, 45.95, -104.06, -96.44],
  TN: [34.98, 36.68, -90.31, -81.65], TX: [25.84, 36.5, -106.65, -93.51], UT: [37.0, 42.0, -114.05, -109.04],
  VT: [42.73, 45.02, -73.44, -71.46], VA: [36.54, 39.47, -83.68, -75.24], WA: [45.54, 49.0, -124.76, -116.92],
  WV: [37.2, 40.64, -82.64, -77.72], WI: [42.49, 47.08, -92.89, -86.25], WY: [41.0, 45.01, -111.06, -104.05],
}

function inBox([minLat, maxLat, minLng, maxLng]: [number, number, number, number], lat: number, lng: number, pad: number) {
  return lat >= minLat - pad && lat <= maxLat + pad && lng >= minLng - pad && lng <= maxLng + pad
}

function stateFromLatLng(lat: number | null, lng: number | null): { state: string | null; why: string } {
  if (lat == null || lng == null || (lat === 0 && lng === 0)) return { state: null, why: "no coordinates" }
  const near = Object.keys(STATE_BOXES).filter((s) => inBox(STATE_BOXES[s], lat, lng, BORDER_MARGIN))
  if (near.length === 0) return { state: null, why: "outside the US" }
  if (near.length > 1) return { state: null, why: "near a state border" }
  const s = near[0]
  if (!inBox(STATE_BOXES[s], lat, lng, -BORDER_MARGIN)) return { state: null, why: "near a state border" }
  return { state: s, why: "" }
}

// ── Plan ─────────────────────────────────────────────────────────────────────

const isBlank = (v: string | null) => v == null || v.trim() === ""
const cityKey = (c: string | null) => (c ?? "").trim().toLowerCase()

async function buildPlan(shops: ShopRow[]) {
  // States each city name already has among active shops with a state.
  const cityStates = new Map<string, Set<string>>()
  for (const s of shops) {
    if (isBlank(s.state) || !cityKey(s.city)) continue
    const k = cityKey(s.city)
    if (!cityStates.has(k)) cityStates.set(k, new Set())
    cityStates.get(k)!.add(s.state!.trim().toUpperCase())
  }

  const blank = shops.filter((s) => isBlank(s.state))
  const plan: PlanRow[] = []
  const skipped: { id: string; name: string; reason: string }[] = []

  for (const s of blank) {
    const byAddress = stateFromAddress(s.address)
    // Only the zip column: a bare 5-digit number in the address text is as
    // likely a house number ("13801 Paramount Blvd") as a ZIP.
    const zip = fiveDigitZip(s.zip)
    const byZip = stateFromZip(zip)
    const ll = stateFromLatLng(s.latitude, s.longitude)
    const answers: [Method, string | null][] = [["address", byAddress], ["zip", byZip], ["latlng", ll.state]]
    const given = answers.filter(([, v]) => v) as [Method, string][]
    const distinct = new Set(given.map(([, v]) => v))

    if (distinct.size > 1) {
      skipped.push({ id: s.id, name: s.name ?? "", reason: `methods disagree (${given.map(([m, v]) => `${m} ${v}`).join(", ")})` })
      continue
    }
    if (given.length === 0) {
      const zipWhy = !zip ? "no ZIP" : "ZIP not a US state ZIP"
      skipped.push({ id: s.id, name: s.name ?? "", reason: `no confident method (no state in address, ${zipWhy}, lat/lng ${ll.why})` })
      continue
    }
    const [method, state] = given[0]
    const known = cityStates.get(cityKey(s.city))
    plan.push({
      id: s.id,
      name: s.name ?? "",
      address: s.address ?? "",
      city: s.city ?? "",
      old_state: s.state,
      new_state: state,
      method,
      city_mismatch: known && !known.has(state) ? `"${s.city}" is in ${Array.from(known).sort().join("/")} elsewhere` : "",
    })
  }
  return { blank, plan, skipped }
}

async function countBlank(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const rows = await fetchAll<{ id: string; state: string | null }>(supabase, "shops", "id, state", (q) =>
    q.eq("is_active", true).or("state.is.null,state.eq.,state.eq. ")
  )
  return rows.filter((r) => isBlank(r.state)).length
}

async function main() {
  modeBanner(ARGS.apply)
  const supabase = getSupabaseAdmin()
  const shops = await fetchAll<ShopRow>(
    supabase,
    "shops",
    "id, name, address, city, state, zip, latitude, longitude",
    (q) => q.eq("is_active", true)
  )
  const { blank, plan, skipped } = await buildPlan(shops)

  console.log(`Active shops: ${shops.length}`)
  console.log(`Active shops with no state (null or empty): ${blank.length}`)
  console.log(`\nExamples:`)
  console.table(
    blank.slice(0, 10).map((s) => ({ id: s.id, name: s.name, address: s.address, city: s.city, zip: s.zip, lat: s.latitude, lng: s.longitude }))
  )

  const byMethod = (m: Method) => plan.filter((p) => p.method === m).length
  console.log(`\n── Plan ──`)
  console.log(`Get a state: ${plan.length}`)
  console.log(`  from address text: ${byMethod("address")}`)
  console.log(`  from ZIP:          ${byMethod("zip")}`)
  console.log(`  from lat/lng:      ${byMethod("latlng")}`)
  console.log(`Skipped: ${skipped.length}`)
  const reasons = new Map<string, number>()
  for (const s of skipped) {
    const r = s.reason.startsWith("methods disagree") ? "methods disagree" : s.reason
    reasons.set(r, (reasons.get(r) ?? 0) + 1)
  }
  for (const [r, n] of Array.from(reasons.entries()).sort((a, b) => b[1] - a[1])) console.log(`  ${n}  ${r}`)
  const disagree = skipped.filter((s) => s.reason.startsWith("methods disagree"))
  if (disagree.length) {
    console.log(`\nDisagreements:`)
    for (const d of disagree.slice(0, 20)) console.log(`  ${d.id}  ${d.name}  ${d.reason}`)
  }
  const mismatches = plan.filter((p) => p.city_mismatch)
  console.log(`\nCity mismatches (new state differs from other shops in the same city): ${mismatches.length}`)
  for (const m of mismatches.slice(0, 30)) console.log(`  ${m.id}  ${m.name}  city ${m.city}  → ${m.new_state} (${m.method}); ${m.city_mismatch}`)

  if (!ARGS.apply) {
    const dir = path.resolve(ARGS.output ?? "data/backfill-shop-state")
    const headers = ["id", "name", "address", "old_state", "new_state", "method", "city_mismatch"]
    const csv = writeCsv(path.join(dir, "plan.csv"), headers, plan as unknown as Record<string, unknown>[])
    writeCsv(path.join(dir, "skipped.csv"), ["id", "name", "reason"], skipped)
    fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(plan.map((p) => ({ id: p.id, new_state: p.new_state })), null, 1))
    console.log(`\nCSV: ${csv}`)
    console.log(`Skipped CSV: ${path.join(dir, "skipped.csv")}`)
    console.log(`Plan for --apply: ${path.join(dir, "plan.json")}`)
    return
  }

  // ── Apply ──
  if (!ARGS.input) {
    console.error("--apply needs --input <plan.json> from the dry run.")
    process.exit(1)
  }
  const expected = JSON.parse(fs.readFileSync(path.resolve(ARGS.input), "utf-8")) as { id: string; new_state: string }[]
  const expectedKey = expected.map((p) => `${p.id}=${p.new_state}`).sort().join("\n")
  const currentKey = plan.map((p) => `${p.id}=${p.new_state}`).sort().join("\n")
  if (expected.length !== plan.length || expectedKey !== currentKey) {
    console.error(`STOP: the plan changed since the dry run (dry run ${expected.length} rows, now ${plan.length}). Nothing written.`)
    process.exit(1)
  }

  const before = await countBlank(supabase)
  const undo = new UndoLog(SCRIPT)
  let updated = 0
  const notUpdated: string[] = []
  await runPool(plan, 10, async (p) => {
    undo.append([{ table: "shops", id: p.id, field: "state", old_value: p.old_state ?? null, new_value: p.new_state }])
    // Guarded: only writes while the row is still active with no state.
    const { data, error } = await supabase
      .from("shops")
      .update({ state: p.new_state })
      .eq("id", p.id)
      .eq("is_active", true)
      .or("state.is.null,state.eq.,state.eq. ")
      .select("id")
    if (error) throw new Error(`update ${p.id} failed: ${error.message}`)
    if (data && data.length === 1) updated++
    else notUpdated.push(p.id)
  })
  const after = await countBlank(supabase)

  console.log(`\n── Applied ──`)
  console.log(`Updated: ${updated} of ${plan.length}`)
  if (notUpdated.length) console.log(`Not updated (state filled in or shop deactivated since): ${notUpdated.join(", ")}`)
  console.log(`Undo log: ${undo.file}`)
  console.log(`Undo: npx tsx scripts/undo.ts --input ${path.relative(process.cwd(), undo.file)} [--apply]`)
  console.log(`Active shops with no state: before ${before}, after ${after}, dropped ${before - after}`)
  console.log(before - after === updated ? "OK: dropped by exactly the applied count." : "MISMATCH: the drop doesn't equal the applied count.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
