// validate-import.ts
// Pre-import validation gate (Task 3). Validates a shops CSV — the format
// scripts/import-booksy-shops.ts consumes (booksy_id, name, address, city,
// state, zip_code, lat, lng, reviews_stars, reviews_count) — against the
// same USABLE definition scripts/lib/audit.ts uses, checks how many rows
// would collide with a place_id already in Supabase (upsert would silently
// ignore these), and on completion writes the validation sidecar that the
// importers require before they'll run with --validated.
//
// Writes NOTHING to Supabase — every call here is a `.select()`.
//
// Run: npx tsx scripts/validate-import.ts --input path/to/file.csv [--limit N]

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { writeSidecar } from "./lib/validation-sidecar"
import { US_STATES_PLUS_DC } from "./lib/audit"

const ARGS = parseScriptArgs()

if (!ARGS.input) {
  console.error("Usage: npx tsx scripts/validate-import.ts --input path/to/file.csv [--limit N]")
  process.exit(1)
}

const CSV_PATH = path.resolve(ARGS.input)
const supabase = getSupabaseAdmin()

// Same hand-rolled RFC-4180 parser used by the importers — kept duplicated
// per house style rather than extracted (see scripts/import-booksy-shops.ts).
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = i + 1 < text.length ? text[i + 1] : ""
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++ }
      else if (ch === '"') { inQuotes = false }
      else { field += ch }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ",") { row.push(field); field = "" }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && next === "\n") i++
        row.push(field); field = ""
        if (row.some((f) => f.length > 0)) rows.push(row)
        row = []
      } else { field += ch }
    }
  }
  row.push(field)
  if (row.some((f) => f.length > 0)) rows.push(row)
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1).map((values) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = values[i] ?? "" })
    return obj
  })
}

interface PassingRow {
  record: Record<string, unknown>
}

function reject(counts: Map<string, number>, samples: Map<string, string[]>, reason: string, id: string) {
  counts.set(reason, (counts.get(reason) ?? 0) + 1)
  const list = samples.get(reason) ?? []
  if (list.length < 5) list.push(id)
  samples.set(reason, list)
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`)
    process.exit(1)
  }

  console.log(`Reading ${CSV_PATH}...`)
  const text = fs.readFileSync(CSV_PATH, "utf-8")
  let rows = parseCSV(text)
  console.log(`  ${rows.length} rows parsed.\n`)

  if (ARGS.limit != null) rows = rows.slice(0, ARGS.limit)

  const rejectCounts = new Map<string, number>()
  const rejectSamples = new Map<string, string[]>()
  const passing: PassingRow[] = []

  for (const row of rows) {
    const id = row.booksy_id?.trim() || row.name?.trim() || "(unknown)"

    const name = row.name?.trim()
    if (!name) { reject(rejectCounts, rejectSamples, "empty name", id); continue }

    const address = row.address?.trim()
    if (!address) { reject(rejectCounts, rejectSamples, "missing address", id); continue }

    const state = row.state?.trim().toUpperCase()
    if (!state || !US_STATES_PLUS_DC.has(state)) { reject(rejectCounts, rejectSamples, "bad state code", id); continue }

    const lat = row.lat ? parseFloat(row.lat) : NaN
    const lng = row.lng ? parseFloat(row.lng) : NaN
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) { reject(rejectCounts, rejectSamples, "missing coords", id); continue }

    const booksyId = row.booksy_id?.trim()
    const slug = booksyId ? `booksy-${booksyId}` : ""
    if (!booksyId || slug.length < 8) { reject(rejectCounts, rejectSamples, "malformed slug", id); continue }

    passing.push({
      record: {
        name,
        slug,
        address,
        city: row.city?.trim() || null,
        state,
        zip: row.zip_code?.trim() || null,
        latitude: lat,
        longitude: lng,
        place_id: `booksy:${booksyId}`,
      },
    })
  }

  // Distinct state codes present across the WHOLE file (not just passing rows)
  const allStateCounts = new Map<string, number>()
  for (const row of rows) {
    const s = row.state?.trim().toUpperCase() || "(none)"
    allStateCounts.set(s, (allStateCounts.get(s) ?? 0) + 1)
  }

  // place_id collisions against the live shops table — these would be
  // silently ignored by the importer's upsert(..., { ignoreDuplicates: true }).
  const placeIds = passing.map((p) => p.record.place_id as string)
  const existing = new Set<string>()
  const PAGE = 500
  for (let i = 0; i < placeIds.length; i += PAGE) {
    const batch = placeIds.slice(i, i + PAGE)
    const { data, error } = await supabase.from("shops").select("place_id").in("place_id", batch)
    if (error) { console.error("  Error checking place_id collisions:", error.message); continue }
    for (const r of data ?? []) existing.add(r.place_id as string)
  }
  const collisionCount = passing.filter((p) => existing.has(p.record.place_id as string)).length

  // ── Report ──
  console.log(`Row count: ${rows.length}`)
  console.log(`Usable (would be inserted): ${passing.length}`)
  console.log(`Rejected: ${rows.length - passing.length}\n`)

  console.log("Rejected, by reason:")
  if (rejectCounts.size === 0) console.log("  (none)")
  for (const [reason, count] of rejectCounts) {
    console.log(`  ${reason}: ${count}  (e.g. ${rejectSamples.get(reason)?.join(", ")})`)
  }

  console.log(`\nplace_id collisions with existing shops (would be ignored, not inserted, by the upsert): ${collisionCount} of ${passing.length}`)

  console.log("\nDistinct state codes present in file:")
  Array.from(allStateCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([s, c]) => console.log(`  ${s.padEnd(6)} ${c}`))

  console.log(`\nSample of ${Math.min(10, passing.length)} rows that would be inserted:`)
  passing.slice(0, 10).forEach((p, i) => {
    console.log(`\n[${i + 1}]`)
    console.log(JSON.stringify(p.record, null, 2))
  })

  if (passing.length === 0) {
    console.error("\n✗ VALIDATION FAILED: no usable rows in this file.")
    process.exit(1)
  }

  const sidecarFile = writeSidecar(CSV_PATH, rows.length)
  console.log(`\n✓ Validation complete. Wrote ${sidecarFile}`)
  console.log(`  Import scripts can now be run with: --input "${CSV_PATH}" --validated`)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
