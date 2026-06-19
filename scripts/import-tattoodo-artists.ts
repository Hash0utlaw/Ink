// import-tattoodo-artists.ts
// Imports Tattoodo artist records from CSV into the artists table.
// Run: npx tsx scripts/import-tattoodo-artists.ts [--dry-run]

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

const CSV_PATH = path.resolve("/Users/hashoutlaw/Desktop/us_artists_import.csv")
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

// ── Parsers ───────────────────────────────────────────────────────────────────

// Single-pass RFC 4180 CSV parser — handles quoted fields with embedded commas/newlines.
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

// Parses PostgreSQL array format: {"Neo-Traditional","Anime","Blackwork"}
function parsePgArray(value: string): string[] {
  if (!value || value === "{}" || value === "NULL") return []
  const inner = value.replace(/^\{|\}$/g, "")
  const results: string[] = []
  let current = ""
  let inStr = false
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (ch === '"') {
      inStr = !inStr
    } else if (ch === "," && !inStr) {
      results.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  if (current.trim()) results.push(current.trim())
  return results.filter(Boolean)
}

function parseBool(value: string): boolean {
  return value?.toLowerCase() === "true"
}

function clampRating(value: string): number {
  const n = parseFloat(value)
  if (isNaN(n)) return 0
  return Math.max(0, Math.min(5, n))
}

// ── Build record ──────────────────────────────────────────────────────────────

type ArtistRecord = {
  row: Record<string, string>
  insert: Record<string, unknown>
}

function buildRecord(row: Record<string, string>): ArtistRecord | null {
  const slug = row.slug?.trim()
  const name = row.name?.trim()
  if (!slug || !name || slug.length < 2) return null

  const specialties = parsePgArray(row.specialties)

  return {
    row,
    insert: {
      display_name: name,
      handle: slug,
      bio: row.bio?.trim() || null,
      avatar_url: row.profile_image_url?.trim() || null,
      city: row.city?.trim() || null,
      state: row.state?.trim().toUpperCase() || null,
      specialties,
      instagram_handle: null,
      website_url: row.source_url?.trim() || null,
      rating: clampRating(row.review_average),
      review_count: parseInt(row.review_count) || 0,
      is_available: parseBool(row.bookings_allowed),
      is_active: parseBool(row.is_active),
      is_verified: parseBool(row.is_verified),
      is_claimed: false,
      source: "tattoodo",
    },
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

  const records: ArtistRecord[] = []
  let skipped = 0

  for (const row of rows) {
    const record = buildRecord(row)
    if (!record) { skipped++ } else { records.push(record) }
  }

  console.log(`  ${records.length} valid records, ${skipped} skipped.\n`)
  if (records.length === 0) { console.log("Nothing to insert."); process.exit(0) }

  // State breakdown
  const byState: Record<string, number> = {}
  for (const r of records) {
    const s = (r.insert.state as string) ?? "UNKNOWN"
    byState[s] = (byState[s] ?? 0) + 1
  }
  console.log("State breakdown:")
  Object.entries(byState)
    .sort((a, b) => b[1] - a[1])
    .forEach(([state, count]) => console.log(`  ${state.padEnd(4)} ${count}`))

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would upsert ${records.length} artists. Sample:`)
    console.log(JSON.stringify(records[0].insert, null, 2))
    const samplePortfolio = parsePgArray(records[0].row.portfolio_images).slice(0, 3)
    console.log(`  Portfolio images for sample artist:`, samplePortfolio)
    return
  }

  // ── Step 1: Upsert artists ──────────────────────────────────────────────────
  console.log(`\nUpserting artists in batches of ${BATCH_SIZE}...`)
  const inserts = records.map((r) => r.insert)
  const totalBatches = Math.ceil(inserts.length / BATCH_SIZE)
  let artistsQueued = 0

  for (let i = 0; i < totalBatches; i++) {
    const batch = inserts.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    const { error } = await supabase
      .from("artists")
      .upsert(batch, { onConflict: "handle", ignoreDuplicates: true })
    if (error) {
      console.error(`  Batch ${i + 1}/${totalBatches} ERROR:`, error.message)
    } else {
      artistsQueued += batch.length
      console.log(`  Batch ${i + 1}/${totalBatches} — ${batch.length} queued`)
    }
  }

  // ── Step 2: Insert portfolio images ────────────────────────────────────────
  // Fetch UUIDs for all handles we just upserted
  const handles = records.map((r) => r.insert.handle as string)
  console.log(`\nFetching artist IDs to link portfolio images...`)
  const { data: artistRows, error: fetchErr } = await supabase
    .from("artists")
    .select("id, handle")
    .in("handle", handles)

  if (fetchErr || !artistRows) {
    console.error("  Could not fetch artist IDs:", fetchErr?.message)
    console.log(`\n✓ Done. ${artistsQueued} artists upserted (portfolio images skipped).`)
    return
  }

  const handleToId = new Map<string, string>(
    artistRows.map((r: { id: string; handle: string }) => [r.handle, r.id])
  )

  const portfolioRows: Record<string, unknown>[] = []
  for (const rec of records) {
    const artistId = handleToId.get(rec.insert.handle as string)
    if (!artistId) continue
    const images = parsePgArray(rec.row.portfolio_images).slice(0, 10)
    images.forEach((url, idx) => {
      portfolioRows.push({
        artist_id: artistId,
        image_url: url,
        display_order: idx,
      })
    })
  }

  console.log(`  Inserting ${portfolioRows.length} portfolio images...`)
  const ptBatches = Math.ceil(portfolioRows.length / BATCH_SIZE)
  let imagesInserted = 0

  for (let i = 0; i < ptBatches; i++) {
    const batch = portfolioRows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    const { error } = await supabase.from("portfolio_images").insert(batch)
    if (error) {
      console.error(`  Portfolio batch ${i + 1}/${ptBatches} ERROR:`, error.message)
    } else {
      imagesInserted += batch.length
    }
  }

  console.log(`\n✓ Done. ${artistsQueued} artists upserted, ${imagesInserted} portfolio images inserted.`)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
