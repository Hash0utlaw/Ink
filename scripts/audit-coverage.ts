// audit-coverage.ts
// Read-only coverage audit for the `shops` table. Makes no writes to
// Supabase — every call below is a `.select()`. Reports shop count and
// USABLE-definition pass rate per state, top-50-metro coverage, duplicate
// (name+address) detection, and field completeness. Writes
// data/coverage-report.md (human-readable) and data/coverage-report.json
// (machine-readable, single source of truth for the markdown render and for
// a future post-import diff).
// Run: npx tsx scripts/audit-coverage.ts

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { fetchAllRows, computeReport, renderMarkdown, type ShopRow } from "./lib/audit"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY.trim())

const DATA_DIR = path.resolve("data")
const HISTORY_DIR = path.join(DATA_DIR, "coverage-history")
const REPORT_JSON_PATH = path.join(DATA_DIR, "coverage-report.json")
const REPORT_MD_PATH = path.join(DATA_DIR, "coverage-report.md")

const SHOP_COLUMNS =
  "id, name, slug, address, city, state, zip, phone, website, latitude, longitude, place_id, rating, review_count, hours, description, cover_image_url, created_at, updated_at"

async function main() {
  console.log("Fetching shops (read-only)...")
  const shops = await fetchAllRows<ShopRow>(supabase, "shops", SHOP_COLUMNS)
  console.log(`  ${shops.length.toLocaleString()} rows fetched.\n`)

  console.log("Computing report...")
  const report = computeReport(shops)

  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.mkdirSync(HISTORY_DIR, { recursive: true })

  if (fs.existsSync(REPORT_JSON_PATH)) {
    const prev = JSON.parse(fs.readFileSync(REPORT_JSON_PATH, "utf-8")) as { generatedAt: string }
    const archivePath = path.join(HISTORY_DIR, `${prev.generatedAt.replace(/[:.]/g, "-")}.json`)
    fs.copyFileSync(REPORT_JSON_PATH, archivePath)
    console.log(`  Archived previous report to ${archivePath}`)
  }

  fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(report, null, 2))
  const markdown = renderMarkdown(report)
  fs.writeFileSync(REPORT_MD_PATH, markdown)

  console.log(`\n✓ Wrote ${REPORT_MD_PATH} and ${REPORT_JSON_PATH}\n`)
  console.log(markdown)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
