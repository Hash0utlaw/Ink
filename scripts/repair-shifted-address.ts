// repair-shifted-address.ts
// Repairs active shops whose address columns were imported shifted by one:
// state is null and `city` holds the street ("1321 Eubank Blvd NE Studio A")
// while `address` holds a note ("The ABQ Collective").
// Run: npx tsx scripts/repair-shifted-address.ts [--only-matched] [--apply]
//   Dry-run by default. Writes data/shifted-address-repair.csv either way;
//   --apply also writes (undo-logged). Never deletes rows.
//   --only-matched  write only rows with a unique Overture match; no-match,
//                   multiple-match and unparsable rows are left untouched.
//
// Proposed fix per row: address = old city value, city = null. The old
// address is dropped when it's only digits ("1333") or already contained in
// the new address ("A-300"); other text is kept in parentheses:
// "4901 Tippecanoe Dr 2nd floor (above Waleed's International Hair Design)".
// overture_id is set from a unique match only when no other shop uses it.
// Then look the
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

const squash = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")

// New address from the street (old city value) plus whatever's worth keeping
// from the old address.
function mergeAddress(street: string, oldAddress: unknown): { address: string; old: "none" | "digits" | "contained" | "appended" } {
  const old = String(oldAddress ?? "").trim()
  if (!old) return { address: street, old: "none" }
  if (/^\d+$/.test(old)) return { address: street, old: "digits" }
  if (squash(street).includes(squash(old))) return { address: street, old: "contained" }
  return { address: `${street} (${old})`, old: "appended" }
}

async function main() {
  modeBanner(ARGS.apply)
  if (ARGS.onlyMatched) console.log("--only-matched: only rows with a unique Overture match are written.\n")
  const supabase = getSupabaseAdmin()

  const all = await fetchAll(supabase, "shops", "id, name, address, city, state, zip, latitude, longitude, is_active, overture_id")
  const usedOvertureIds = new Map(all.filter((s) => s.overture_id).map((s) => [String(s.overture_id), String(s.id)]))
  const shops = all.filter((s) => s.is_active === true)
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

  const stats = { detected: detected.length, unique: 0, none: 0, multiple: 0, unparsable: 0, overtureIdSet: 0, overtureIdSkipped: 0 }
  const oldAddr: Record<string, number> = {}
  const plan: { shop: Row; patch: Row; outcome: string; overtureId: string }[] = []
  for (const shop of detected) {
    const street = String(shop.city).trim()
    const merged = mergeAddress(street, shop.address)
    const patch: Row = { address: merged.address, city: null }
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
        const owner = usedOvertureIds.get(overtureId)
        if (isEmptyValue(shop.overture_id) && (owner == null || owner === String(shop.id))) {
          patch.overture_id = overtureId
          usedOvertureIds.set(overtureId, String(shop.id)) // two repaired shops can't share one
          stats.overtureIdSet++
        } else {
          stats.overtureIdSkipped++
        }
      } else if (hits.length > 1) {
        stats.multiple++
        outcome = `multiple matches (${hits.length})`
      } else {
        stats.none++
      }
    }
    plan.push({ shop, patch, outcome, overtureId })
    if (!ARGS.onlyMatched || outcome === "unique match") oldAddr[merged.old] = (oldAddr[merged.old] ?? 0) + 1
  }
  const toWrite = ARGS.onlyMatched ? plan.filter((p) => p.outcome === "unique match") : plan

  const out = writeCsv(
    "data/shifted-address-repair.csv",
    ["id", "name", "outcome", "written", "overture_id", "overture_id_set", "old_address", "old_city", "new_address", "new_city", "new_state", "new_zip", "new_latitude", "new_longitude"],
    plan.map(({ shop, patch, outcome, overtureId }) => ({
      id: shop.id, name: shop.name, outcome, overture_id: overtureId,
      written: !ARGS.onlyMatched || outcome === "unique match", overture_id_set: patch.overture_id != null,
      old_address: shop.address, old_city: shop.city,
      new_address: patch.address, new_city: patch.city, new_state: patch.state, new_zip: patch.zip,
      new_latitude: patch.latitude, new_longitude: patch.longitude,
    }))
  )

  if (ARGS.apply) {
    const undo = new UndoLog("repair-shifted-address")
    let done = 0
    await runPool(toWrite, 10, async (p) => {
      await loggedUpdate(supabase, undo, "shops", String(p.shop.id), p.shop, p.patch)
      done++
    })
    console.log(`Updated ${done} shops. Undo log: ${undo.file} (${undo.entries} entries)\n`)
  }

  console.log(`── Report${ARGS.apply ? "" : " — DRY RUN"} ──`)
  console.log(`Rows detected:         ${stats.detected}`)
  console.log(`Unique Overture match: ${stats.unique} (city/state/zip/coords proposed)`)
  console.log(`No match:              ${stats.none}`)
  console.log(`Multiple matches:      ${stats.multiple}`)
  console.log(`Unparsable street:     ${stats.unparsable}`)
  console.log(`overture_id set:       ${stats.overtureIdSet} (skipped, already used by another shop: ${stats.overtureIdSkipped})`)
  console.log(`Old address (written rows): ${JSON.stringify(oldAddr)}`)
  console.log(`Rows ${ARGS.apply ? "written" : "that would be written"}: ${toWrite.length}${ARGS.onlyMatched ? " (unique matches only)" : ""}`)

  const fmt = (r: Row) =>
    `address=${JSON.stringify(r.address ?? null)} city=${JSON.stringify(r.city ?? null)} state=${JSON.stringify(r.state ?? null)} zip=${JSON.stringify(r.zip ?? null)} lat/lng=${r.latitude ?? "∅"},${r.longitude ?? "∅"} overture_id=${r.overture_id ?? "∅"}`
  const samples = ARGS.onlyMatched
    ? toWrite.slice(0, 10)
    : [...plan.filter((p) => p.outcome === "unique match").slice(0, 7), ...plan.filter((p) => p.outcome !== "unique match").slice(0, 3)]
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
