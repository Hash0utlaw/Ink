// import-booksy-artists.ts
// Imports Booksy artist rows as shop_artists entries.
// Requires import-booksy-shops.ts to have run first (needs place_id = booksy:{id}).
// Run: npx tsx scripts/import-booksy-artists.ts [--dry-run]
//   --input=path/to/file.csv   override the default CSV path
//   --state=XX                 only import rows whose resolved shop is in this state
//   --limit=N                  only import the first N matching rows
//   --validated                required (unless --dry-run) — see validate-import.ts

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { checkSidecar } from "./lib/validation-sidecar"
import { printImportSummary } from "./lib/summary"
import { writeRunLogStart, finishRunLog } from "./lib/run-log"

const ARGS = parseScriptArgs()
const ARTISTS_CSV = path.resolve(
  ARGS.input ?? "/Users/hashoutlaw/Desktop/Claude/Claude/scraper/data/booksy_artists.csv"
)
const DRY_RUN = ARGS.dryRun
const BATCH_SIZE = 200

if (DRY_RUN) console.log("DRY RUN — no data will be written.\n")

const supabase = getSupabaseAdmin()

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

const PLACEHOLDER_NAMES = new Set([
  "artist", "staff", "guest", "tattoo artist", "resident artist",
  "shop artist", "tbd", "n/a", "na", "unknown", "coming soon",
])

function shouldSkip(name: string | null | undefined): boolean {
  if (!name) return true
  const t = name.trim()
  if (t.length < 2) return true
  return PLACEHOLDER_NAMES.has(t.toLowerCase())
}

// ── Step 1: Build booksy_business_id → shop UUID map ─────────────────────────
// Also resolves each shop's state, so --state can filter artist rows by the
// state of the shop they belong to (shop_artists has no state column of its
// own — this is metadata resolved for filtering, not a change to the
// shop_artists insert shape).

interface ShopInfo {
  id: string
  state: string | null
}

async function buildShopMap(booksyBusinessIds: string[]): Promise<Map<string, ShopInfo>> {
  const map = new Map<string, ShopInfo>()
  if (booksyBusinessIds.length === 0) return map

  // Query in pages to avoid URL length limits
  const PAGE = 500
  const unique = [...new Set(booksyBusinessIds)]

  for (let i = 0; i < unique.length; i += PAGE) {
    const batch = unique.slice(i, i + PAGE).map((id) => `booksy:${id}`)
    const { data, error } = await supabase
      .from("shops")
      .select("id, place_id, state")
      .in("place_id", batch)

    if (error) {
      console.error("  Error fetching shops:", error.message)
      continue
    }

    for (const shop of data ?? []) {
      const booksyId = (shop.place_id as string).replace("booksy:", "")
      map.set(booksyId, { id: shop.id as string, state: (shop.state as string | null) ?? null })
    }
  }

  return map
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(ARTISTS_CSV)) {
    console.error(`CSV not found: ${ARTISTS_CSV}`)
    process.exit(1)
  }

  if (!DRY_RUN) {
    if (!ARGS.validated) {
      console.error("Refusing to run: pass --validated (after scripts/validate-import.ts has passed for this CSV) or --dry-run.")
      process.exit(1)
    }
    const sidecar = checkSidecar(ARTISTS_CSV)
    if (!sidecar.valid) {
      console.error(`Refusing to run: ${sidecar.reason}`)
      process.exit(1)
    }
  }

  console.log(`Reading ${ARTISTS_CSV}...`)
  const text = fs.readFileSync(ARTISTS_CSV, "utf-8")
  const rows = parseCSV(text)
  console.log(`  ${rows.length} rows parsed.\n`)

  // Collect all booksy_business_ids we need to resolve
  const booksyBusinessIds = [
    ...new Set(rows.map((r) => r.booksy_business_id?.trim()).filter(Boolean)),
  ] as string[]
  console.log(`  Resolving ${booksyBusinessIds.length} unique Booksy business IDs to shop UUIDs...`)

  const shopMap = await buildShopMap(booksyBusinessIds)
  console.log(`  Resolved ${shopMap.size} shops.\n`)

  if (shopMap.size === 0) {
    if (DRY_RUN) {
      console.log("[DRY RUN] Shops not yet in DB — skipping Supabase lookup.")
      console.log(`  CSV has ${rows.length} artist rows referencing ${booksyBusinessIds.length} unique shops.`)
      console.log("  Sample artist row:", JSON.stringify(rows[0], null, 2))
      return
    }
    console.error("No shops found. Did you run import-booksy-shops.ts first?")
    process.exit(1)
  }

  let records: Record<string, unknown>[] = []
  let skippedName = 0
  let skippedNoShop = 0
  let skippedState = 0

  for (const row of rows) {
    const name = row.name?.trim()
    if (shouldSkip(name)) { skippedName++; continue }

    const booksyBusinessId = row.booksy_business_id?.trim()
    const shopInfo = shopMap.get(booksyBusinessId)
    if (!shopInfo) { skippedNoShop++; continue }
    if (ARGS.state && shopInfo.state !== ARGS.state) { skippedState++; continue }

    // specialty: take first entry from comma-separated styles
    const specialty = row.styles?.trim().split(",")[0]?.trim() || null

    records.push({
      shop_id: shopInfo.id,
      name,
      image_url: row.photo_url?.trim() || null,
      specialty,
      artist_profile_id: null,
    })
  }

  console.log(`  ${records.length} valid records`)
  console.log(`  ${skippedName} skipped (bad name)`)
  console.log(`  ${skippedNoShop} skipped (shop not found in DB)`)
  if (ARGS.state) console.log(`  ${skippedState} skipped (shop not in --state ${ARGS.state})`)

  if (ARGS.limit != null) {
    records = records.slice(0, ARGS.limit)
    console.log(`  Limited to ${records.length} via --limit`)
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would insert ${records.length} shop_artists rows. Sample:`)
    console.log(JSON.stringify(records[0], null, 2))
    return
  }

  if (records.length === 0) {
    console.log("\nNothing to insert.")
    process.exit(0)
  }

  const runLogFile = writeRunLogStart("import-booksy-artists", ARTISTS_CSV, ARGS as unknown as Record<string, unknown>)

  console.log(`\nInserting in batches of ${BATCH_SIZE}...`)
  const totalBatches = Math.ceil(records.length / BATCH_SIZE)
  let inserted = 0

  for (let i = 0; i < totalBatches; i++) {
    const batch = records.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    const { data, error } = await supabase
      .from("shop_artists")
      .insert(batch)
      .select("id")
    if (error) {
      console.error(`  Batch ${i + 1}/${totalBatches} ERROR:`, error.message)
    } else {
      const insertedThisBatch = data?.length ?? batch.length
      inserted += insertedThisBatch
      console.log(`  Batch ${i + 1}/${totalBatches} — ${insertedThisBatch} inserted`)
    }
  }

  // shop_artists has no unique constraint to conflict against (plain insert,
  // not upsert — see docs/source-plan.md / plan notes), so there is no
  // "ignored as duplicate" count here: every valid row either inserts or errors.
  printImportSummary({
    rowsRead: rows.length,
    skipped: [
      { reason: "bad name", count: skippedName },
      { reason: "shop not found in DB", count: skippedNoShop },
      ...(ARGS.state ? [{ reason: `shop not in --state ${ARGS.state}`, count: skippedState }] : []),
    ],
    inserted,
    ignoredDuplicates: 0,
  })
  finishRunLog(runLogFile, { rowsRead: rows.length, inserted, ignoredDuplicates: 0, skipped: skippedName + skippedNoShop + skippedState })

  console.log(`✓ Done. ${inserted} Booksy artists inserted into shop_artists.`)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
