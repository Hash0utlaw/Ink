// import-booksy-shops.ts
// Imports Booksy businesses as shop records.
// Stores place_id = "booksy:{id}" for downstream artist import.
// Run: npx tsx scripts/import-booksy-shops.ts [--dry-run]

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

const CSV_PATH = path.resolve(
  "/Users/hashoutlaw/Desktop/Claude/Claude/scraper/data/booksy_businesses.csv"
)
const DRY_RUN = process.argv.includes("--dry-run")
const BATCH_SIZE = 200

if (DRY_RUN) console.log("DRY RUN — no data will be written.\n")

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY.trim())

// ── CSV parser ────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

// Strip ", STATE" suffix that Booksy sometimes appends to city names
function cleanCity(city: string, state: string): string {
  const suffix = `, ${state}`
  return city.endsWith(suffix) ? city.slice(0, -suffix.length).trim() : city.trim()
}

function clampRating(value: string): number {
  const n = parseFloat(value)
  if (isNaN(n)) return 0
  return Math.max(0, Math.min(5, Math.round(n * 10) / 10))
}

function buildRecord(row: Record<string, string>): Record<string, unknown> | null {
  const booksyId = row.booksy_id?.trim()
  const name = row.name?.trim()
  if (!booksyId || !name) return null

  const state = row.state?.trim().toUpperCase() || null
  const city = cleanCity(row.city ?? "", state ?? "")

  return {
    name,
    slug: `booksy-${booksyId}`,
    address: row.address?.trim() || null,
    city: city || null,
    state,
    zip: row.zip_code?.trim() || null,
    latitude: row.lat ? parseFloat(row.lat) : null,
    longitude: row.lng ? parseFloat(row.lng) : null,
    rating: clampRating(row.reviews_stars),
    review_count: parseInt(row.reviews_count) || 0,
    place_id: `booksy:${booksyId}`,
    is_active: true,
    is_verified: false,
    accepts_walk_ins: false,
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`)
    process.exit(1)
  }

  console.log(`Reading ${CSV_PATH}...`)
  const text = fs.readFileSync(CSV_PATH, "utf-8")
  const rows = parseCSV(text)
  console.log(`  ${rows.length} rows parsed.\n`)

  const records: Record<string, unknown>[] = []
  let skipped = 0

  for (const row of rows) {
    const record = buildRecord(row)
    if (!record) { skipped++ } else { records.push(record) }
  }

  console.log(`  ${records.length} valid records, ${skipped} skipped.`)

  // State breakdown
  const byState: Record<string, number> = {}
  for (const r of records) {
    const s = (r.state as string) ?? "UNKNOWN"
    byState[s] = (byState[s] ?? 0) + 1
  }
  console.log("\nState breakdown:")
  Object.entries(byState)
    .sort((a, b) => b[1] - a[1])
    .forEach(([state, count]) => console.log(`  ${state.padEnd(4)} ${count}`))

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would upsert ${records.length} shops. Sample:`)
    console.log(JSON.stringify(records[0], null, 2))
    return
  }

  console.log(`\nUpserting in batches of ${BATCH_SIZE}...`)
  const totalBatches = Math.ceil(records.length / BATCH_SIZE)
  let inserted = 0

  for (let i = 0; i < totalBatches; i++) {
    const batch = records.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    const { error } = await supabase
      .from("shops")
      .upsert(batch, { onConflict: "place_id", ignoreDuplicates: true })
    if (error) {
      console.error(`  Batch ${i + 1}/${totalBatches} ERROR:`, error.message)
    } else {
      inserted += batch.length
      console.log(`  Batch ${i + 1}/${totalBatches} — ${batch.length} queued`)
    }
  }

  console.log(`\n✓ Done. ${inserted} Booksy shops upserted.`)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
