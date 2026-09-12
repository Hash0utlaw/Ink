// scripts/geocode-census.ts
// Fills in `latitude`/`longitude` for `shops` rows that have a street address
// but no coordinates, using the free US Census Bureau batch geocoder. Only
// ever writes latitude/longitude, and only on rows where latitude is
// currently null — the null guard is enforced in the SQL WHERE clause
// (.is("latitude", null) on the update itself), not just in the row
// selection.
//
// Run: npx tsx scripts/geocode-census.ts [--limit=N] [--state=XX] [--dry-run]
//   --limit=N       cap total rows processed this run (default: all eligible)
//   --state=XX      only process rows for this state
//   --dry-run       fetch + geocode + report; no DB writes, no checkpoint,
//                   no baseline snapshot
//
// Chunking (1,000/request, 2s pause between chunks), the null-guarded
// write-back, and checkpointing (data/geocode-checkpoint.json, so Ctrl+C and
// a re-run resumes) live in scripts/lib/geocode-runner.ts, shared with
// scripts/geocode-census-retry.ts.
//
// Task 1 gate: `npx tsx scripts/geocode-census.ts --limit=100 --dry-run`
// exercises this same code path on a small sample so the match rate and a
// handful of samples can be eyeballed before a full run.

import { config } from "dotenv"
config({ path: ".env.local" })

import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { type GeocodeCandidate } from "./lib/census-geocoder"
import { captureBaselineIfMissing } from "./lib/geocode-baseline"
import { runChunkedGeocode, loadProcessedIds, type GeocodeSubmissionRow } from "./lib/geocode-runner"

const ARGS = parseScriptArgs()
const DRY_RUN = ARGS.dryRun
const CHECKPOINT_PATH = "data/geocode-checkpoint.json"

const SHOP_COLUMNS = "id, name, address, city, state, zip"

type Candidate = GeocodeCandidate & { name: string | null }

async function fetchEligible(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  processed: Set<string>,
  state: string | null,
  limit: number | null
): Promise<Candidate[]> {
  const PAGE = 1000
  const collected: Candidate[] = []
  let from = 0
  for (;;) {
    let query = supabase
      .from("shops")
      .select(SHOP_COLUMNS)
      .is("latitude", null)
      .not("address", "is", null)
      .not("city", "is", null)
      .not("state", "is", null)
      .not("zip", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1)
    if (state) query = query.eq("state", state)

    const { data, error } = await query
    if (error) throw new Error(`fetchEligible: ${error.message}`)
    const page = (data ?? []) as Candidate[]

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
    console.log(`Resuming: ${processedSet.size.toLocaleString()} shop ids already processed per checkpoint.\n`)
  }

  console.log(
    `Selecting eligible shops (null latitude${ARGS.state ? `, state=${ARGS.state}` : ""}${
      ARGS.limit != null ? `, limit=${ARGS.limit}` : ""
    })...`
  )
  const pending = await fetchEligible(supabase, processedSet, ARGS.state, ARGS.limit)
  console.log(`  ${pending.length.toLocaleString()} rows to process.\n`)

  if (pending.length === 0) {
    console.log("Nothing to geocode.")
    return
  }

  const submissionRows: GeocodeSubmissionRow[] = pending.map((c) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    city: c.city,
    state: c.state,
    zip: c.zip,
  }))

  const result = await runChunkedGeocode({
    supabase,
    candidates: submissionRows,
    checkpointPath: CHECKPOINT_PATH,
    dryRun: DRY_RUN,
  })

  console.log("\n── Full run summary ────────────────────────")
  console.log(`Rows processed:     ${result.rowsProcessed.toLocaleString()}`)
  console.log(`Match:              ${result.matched.toLocaleString()}`)
  console.log(`  Exact:            ${result.exact.toLocaleString()}`)
  console.log(`  Non_Exact:        ${result.nonExact.toLocaleString()}`)
  console.log(`No_Match:           ${result.noMatch.toLocaleString()}`)
  console.log(`Tie:                ${result.tie.toLocaleString()}`)
  console.log(`Bounds rejected:    ${result.boundsRejected.toLocaleString()}`)
  console.log(`Rows written (this run):       ${DRY_RUN ? "0 (dry run)" : result.writtenThisRun.toLocaleString()}`)
  console.log(`Cumulative written (all runs): ${result.cumulativeWritten.toLocaleString()}`)
  console.log("─────────────────────────────────────────────\n")

  if (result.samples.length > 0) {
    console.log(`Sample of ${result.samples.length} matched rows:`)
    for (const s of result.samples) {
      console.log(`\n  Shop:            ${s.name}`)
      console.log(`  Input address:   ${s.input}`)
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
