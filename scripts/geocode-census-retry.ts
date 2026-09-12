// scripts/geocode-census-retry.ts
// Second pass for shops still lacking coordinates after
// scripts/geocode-census.ts. Two groups, both handled here:
//
//   1. Rows with a full address/city/state/zip that still got No_Match/Tie
//      on the first pass — often because the street address carries a unit
//      designator ("suite r", "#745a", a trailing bare letter) that breaks
//      Census's exact-match logic. Normalized via
//      scripts/lib/address-normalize.ts before resubmission. The DB's
//      `address` column is never touched — only the string sent to Census
//      is normalized.
//   2. Rows missing city and/or zip (never submitted in the first pass,
//      which required all four fields) — submitted with whatever fields
//      are actually present; Census can often still match on street + city
//      + state alone.
//
// Same null-guarded write, same chunking/checkpoint machinery as the first
// pass (scripts/lib/geocode-runner.ts), but its own checkpoint file so the
// two passes' resume state never collide.
//
// Run: npx tsx scripts/geocode-census-retry.ts [--limit=N] [--state=XX] [--dry-run]

import { config } from "dotenv"
config({ path: ".env.local" })

import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { normalizeAddressForGeocoding } from "./lib/address-normalize"
import { captureBaselineIfMissing } from "./lib/geocode-baseline"
import { runChunkedGeocode, loadProcessedIds, type GeocodeSubmissionRow } from "./lib/geocode-runner"

const ARGS = parseScriptArgs()
const DRY_RUN = ARGS.dryRun
const CHECKPOINT_PATH = "data/geocode-retry-checkpoint.json"

const SHOP_COLUMNS = "id, name, address, city, state, zip"

interface RawShopRow {
  id: string
  name: string | null
  address: string
  city: string | null
  state: string | null
  zip: string | null
}

async function fetchStillUnmatched(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  processed: Set<string>,
  state: string | null,
  limit: number | null
): Promise<RawShopRow[]> {
  const PAGE = 1000
  const collected: RawShopRow[] = []
  let from = 0
  for (;;) {
    let query = supabase
      .from("shops")
      .select(SHOP_COLUMNS)
      .is("latitude", null)
      .not("address", "is", null) // address is the one field every remaining row has
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1)
    if (state) query = query.eq("state", state)

    const { data, error } = await query
    if (error) throw new Error(`fetchStillUnmatched: ${error.message}`)
    const page = (data ?? []) as RawShopRow[]

    for (const row of page) {
      if (processed.has(row.id)) continue
      collected.push(row)
      if (limit != null && collected.length >= limit) return collected
    }

    if (page.length < PAGE) break
    from += PAGE
  }
  return collected
}

async function main() {
  if (DRY_RUN) console.log("DRY RUN — no data will be written.\n")

  const supabase = getSupabaseAdmin()
  if (!DRY_RUN) await captureBaselineIfMissing(supabase)

  const processedSet = loadProcessedIds(CHECKPOINT_PATH, DRY_RUN)
  if (processedSet.size > 0) {
    console.log(`Resuming: ${processedSet.size.toLocaleString()} shop ids already processed per retry checkpoint.\n`)
  }

  console.log(
    `Selecting still-unmatched shops (null latitude${ARGS.state ? `, state=${ARGS.state}` : ""}${
      ARGS.limit != null ? `, limit=${ARGS.limit}` : ""
    })...`
  )
  const pending = await fetchStillUnmatched(supabase, processedSet, ARGS.state, ARGS.limit)
  console.log(`  ${pending.length.toLocaleString()} rows to process.\n`)

  if (pending.length === 0) {
    console.log("Nothing to retry.")
    return
  }

  let normalizedCount = 0
  let missingFieldCount = 0
  const submissionRows: GeocodeSubmissionRow[] = pending.map((row) => {
    const normalizedAddress = normalizeAddressForGeocoding(row.address)
    if (normalizedAddress !== row.address.trim()) normalizedCount++
    if (!row.city || !row.state || !row.zip) missingFieldCount++
    return {
      id: row.id,
      name: row.name,
      address: normalizedAddress,
      city: row.city ?? "",
      state: row.state ?? "",
      zip: row.zip ?? "",
    }
  })
  console.log(`  ${normalizedCount.toLocaleString()} addresses had a unit designator stripped for submission.`)
  console.log(`  ${missingFieldCount.toLocaleString()} rows are missing city/state/zip — submitted with what's present.\n`)

  const result = await runChunkedGeocode({
    supabase,
    candidates: submissionRows,
    checkpointPath: CHECKPOINT_PATH,
    dryRun: DRY_RUN,
  })

  console.log("\n── Retry pass summary ──────────────────────")
  console.log(`Rows retried:       ${result.rowsProcessed.toLocaleString()}`)
  console.log(`Additional matches: ${result.matched.toLocaleString()}`)
  console.log(`  Exact:            ${result.exact.toLocaleString()}`)
  console.log(`  Non_Exact:        ${result.nonExact.toLocaleString()}`)
  console.log(`Still No_Match:     ${result.noMatch.toLocaleString()}`)
  console.log(`Still Tie:          ${result.tie.toLocaleString()}`)
  console.log(`Bounds rejected:    ${result.boundsRejected.toLocaleString()}`)
  console.log(`Rows written (this run):       ${DRY_RUN ? "0 (dry run)" : result.writtenThisRun.toLocaleString()}`)
  console.log(`Cumulative written (all runs, this checkpoint): ${result.cumulativeWritten.toLocaleString()}`)
  console.log("─────────────────────────────────────────────\n")

  if (result.samples.length > 0) {
    console.log(`Sample of ${result.samples.length} recovered rows:`)
    for (const s of result.samples) {
      console.log(`\n  Shop:            ${s.name}`)
      console.log(`  Submitted:       ${s.input}`)
      console.log(`  Parsed lat/lng:  ${s.lat}, ${s.lng}`)
      console.log(`  Census matched:  ${s.matchedAddress}`)
    }
    console.log()
  }
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
