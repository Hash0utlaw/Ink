// repair-shifted-address.ts
// Repairs active shops whose address columns were imported shifted by one:
// state is null and `city` holds the street ("1321 Eubank Blvd NE Studio A")
// while `address` holds a note ("The ABQ Collective").
// Run: npx tsx scripts/repair-shifted-address.ts [--apply]
//   Dry-run by default. Writes data/shifted-address-repair.csv either way;
//   --apply also writes (undo-logged). Never deletes rows.
//
// Proposed fix per row: address = old city value, city = null. Then look the
// shop up in data/overture_tattoo.csv (+ the closed file), nationwide: same
// name (generic words removed) AND the street number + street name both
// appear in Overture's freeform address. Only a UNIQUE match is used, and it
// supplies city / state / zip / latitude / longitude (blank fields only).

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog, loggedUpdate } from "./lib/undo-log"
import { coords, fetchAll, isEmptyValue, modeBanner, normalizeName, parseCSV, runPool, writeCsv } from "./lib/cleanup-utils"
import { US_STATES_PLUS_DC } from "./lib/audit"

type Row = Record<string, unknown>

const ARGS = parseScriptArgs()
const OVERTURE_FILES = ["data/overture_tattoo.csv", "data/overture_tattoo_closed.csv"]
const STREET_START = /^\s*(\d+[a-z]?)(?:-\d+[a-z]?)?\s+(.+)$/i
const DIRECTIONALS = new Set(["n", "s", "e", "w", "ne", "nw", "se", "sw", "north", "south", "east", "west"])
const GENERIC_WORDS = new Set(["tattoo", "tattoos", "studio", "shop", "parlor", "co", "company", "llc", "inc", "the"])

// Same rule as match-open-data.ts: generic words removed, falling back to the
// full normalized name when nothing is left.
function matchName(name: unknown): string {
  const words = String(name ?? "").toLowerCase().replace(/&/g, " and ").split(/[^a-z0-9]+/).filter(Boolean)
  return words.filter((w) => !GENERIC_WORDS.has(w)).join("") || normalizeName(name)
}

const tokens = (s: unknown) => String(s ?? "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

// "1321 Eubank Blvd NE Studio A" → { number: "1321", street: "eubank" }
// "110A W 3rd St" → { number: "110a", street: "3rd" } (directionals skipped)
function streetParts(s: string): { number: string; street: string } | null {
  const m = s.match(STREET_START)
  if (!m) return null
  const street = tokens(m[2]).find((t) => !DIRECTIONALS.has(t))
  return street ? { number: m[1].toLowerCase(), street } : null
}

async function main() {
  modeBanner(ARGS.apply)
  const supabase = getSupabaseAdmin()

  const shops = await fetchAll(supabase, "shops", "id, name, address, city, state, zip, latitude, longitude", (q) =>
    q.eq("is_active", true)
  )
  const detected = shops.filter((s) => isEmptyValue(s.state) && /^\s*\d/.test(String(s.city ?? "")))
  console.log(`${shops.length} active shops; ${detected.length} with no state and a street number in city\n`)

  const byName = new Map<string, Row[]>()
  for (const file of OVERTURE_FILES) {
    if (!fs.existsSync(file)) {
      if (file === OVERTURE_FILES[0]) {
        console.error(`${file} not found — run: npx tsx scripts/overture/fetch.ts`)
        process.exit(1)
      }
      continue
    }
    for (const r of parseCSV(fs.readFileSync(file, "utf-8"))) {
      const key = matchName(r.name)
      const list = byName.get(key)
      if (list) list.push(r)
      else byName.set(key, [r])
    }
  }

  const stats = { detected: detected.length, unique: 0, none: 0, multiple: 0, unparsable: 0 }
  const plan: { shop: Row; patch: Row; outcome: string; overtureId: string }[] = []
  for (const shop of detected) {
    const street = String(shop.city).trim()
    const patch: Row = { address: street, city: null }
    const parts = streetParts(street)
    let outcome = "no match"
    let overtureId = ""
    if (!parts) {
      stats.unparsable++
      outcome = "unparsable street"
    } else {
      const hits = (byName.get(matchName(shop.name)) ?? []).filter((r) => {
        const t = tokens(r.freeform)
        return t.includes(parts.number) && t.includes(parts.street)
      })
      if (hits.length === 1) {
        const o = hits[0]
        const state = String(o.region ?? "").toUpperCase().replace(/^US-/, "")
        const zip = String(o.postcode ?? "").match(/\d{5}/)?.[0]
        const lat = parseFloat(String(o.lat))
        const lng = parseFloat(String(o.lng))
        if (o.locality) patch.city = String(o.locality)
        if (US_STATES_PLUS_DC.has(state)) patch.state = state
        if (zip && isEmptyValue(shop.zip)) patch.zip = zip
        if (!coords(shop) && Number.isFinite(lat) && Number.isFinite(lng)) {
          patch.latitude = lat
          patch.longitude = lng
        }
        stats.unique++
        outcome = "unique match"
        overtureId = String(o.id)
      } else if (hits.length > 1) {
        stats.multiple++
        outcome = `multiple matches (${hits.length})`
      } else {
        stats.none++
      }
    }
    plan.push({ shop, patch, outcome, overtureId })
  }

  const out = writeCsv(
    "data/shifted-address-repair.csv",
    ["id", "name", "outcome", "overture_id", "old_address", "old_city", "new_address", "new_city", "new_state", "new_zip", "new_latitude", "new_longitude"],
    plan.map(({ shop, patch, outcome, overtureId }) => ({
      id: shop.id, name: shop.name, outcome, overture_id: overtureId,
      old_address: shop.address, old_city: shop.city,
      new_address: patch.address, new_city: patch.city, new_state: patch.state, new_zip: patch.zip,
      new_latitude: patch.latitude, new_longitude: patch.longitude,
    }))
  )

  if (ARGS.apply) {
    const undo = new UndoLog("repair-shifted-address")
    await runPool(plan, 10, (p) => loggedUpdate(supabase, undo, "shops", String(p.shop.id), p.shop, p.patch))
    console.log(`Updated ${plan.length} shops. Undo log: ${undo.file}\n`)
  }

  console.log(`── Report${ARGS.apply ? "" : " — DRY RUN"} ──`)
  console.log(`Rows detected:         ${stats.detected}`)
  console.log(`Unique Overture match: ${stats.unique} (city/state/zip/coords proposed)`)
  console.log(`No match:              ${stats.none}`)
  console.log(`Multiple matches:      ${stats.multiple}`)
  console.log(`Unparsable street:     ${stats.unparsable}`)
  console.log(`All ${plan.length} rows get address = old city, city = null (unless a unique match supplies the city).`)

  const fmt = (r: Row) =>
    `address=${JSON.stringify(r.address ?? null)} city=${JSON.stringify(r.city ?? null)} state=${JSON.stringify(r.state ?? null)} zip=${JSON.stringify(r.zip ?? null)} lat/lng=${r.latitude ?? "∅"},${r.longitude ?? "∅"}`
  const samples = [...plan.filter((p) => p.outcome === "unique match").slice(0, 7), ...plan.filter((p) => p.outcome !== "unique match").slice(0, 3)]
  console.log(`\nSamples (before → after):`)
  for (const { shop, patch, outcome } of samples) {
    console.log(`  ${shop.name} [${outcome}]`)
    console.log(`    before: ${fmt(shop)}`)
    console.log(`    after:  ${fmt({ ...shop, ...patch })}`)
  }
  console.log(`\nWrote ${out}`)
  if (!ARGS.apply) console.log("Dry run — nothing written. Pass --apply to write (undo-logged).")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
