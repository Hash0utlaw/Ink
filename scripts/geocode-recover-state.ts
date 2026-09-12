// scripts/geocode-recover-state.ts
// Task 5 — narrow exception to the geocoding safety rules: this script may
// write to `shops.state`, and ONLY `state`, and ONLY on rows where it is
// currently NULL or exactly "NW" or "US" (two junk values found in the
// table). The new value comes ONLY from the state component of the Census
// batch geocoder's matched address — never inferred, guessed, or copied
// from anywhere else. It never touches latitude/longitude, address, city,
// zip, or any other column, and every write is guarded in the WHERE clause
// by the exact prior value it read, not just checked in application logic.
//
// Run: npx tsx scripts/geocode-recover-state.ts [--limit=N] [--dry-run]

import { config } from "dotenv"
config({ path: ".env.local" })

import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { normalizeAddressForGeocoding } from "./lib/address-normalize"
import { buildAddressBatchCsv, submitAddressBatch, parseCensusResponse, type GeocodeCandidate } from "./lib/census-geocoder"
import { US_STATES_PLUS_DC } from "./lib/audit"

const ARGS = parseScriptArgs()
const DRY_RUN = ARGS.dryRun
const CHUNK_SIZE = 1000
const CHUNK_PAUSE_MS = 2000

const SHOP_COLUMNS = "id, name, address, city, state, zip"

interface CandidateRow {
  id: string
  name: string | null
  address: string
  city: string | null
  state: string | null // null | "NW" | "US" by construction of the query below
  zip: string | null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchCandidates(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<CandidateRow[]> {
  const PAGE = 1000
  const collected: CandidateRow[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from("shops")
      .select(SHOP_COLUMNS)
      .or("state.is.null,state.eq.NW,state.eq.US")
      .not("address", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`fetchCandidates: ${error.message}`)
    const page = (data ?? []) as CandidateRow[]
    collected.push(...page)
    if (page.length < PAGE) break
    from += PAGE
  }
  return ARGS.limit != null ? collected.slice(0, ARGS.limit) : collected
}

// Matched address comes back as "STREET, CITY, STATE, ZIP" (a single CSV
// field that itself contains commas — already unquoted by parseCensusResponse).
function extractStateFromMatchedAddress(matchedAddress: string): string | null {
  const parts = matchedAddress.split(",").map((p) => p.trim())
  if (parts.length < 3) return null
  const candidate = parts[parts.length - 2].toUpperCase()
  return US_STATES_PLUS_DC.has(candidate) ? candidate : null
}

interface BeforeAfter {
  id: string
  name: string | null
  before: string | null
  after: string
}

async function main() {
  if (DRY_RUN) console.log("DRY RUN — no data will be written.\n")

  const supabase = getSupabaseAdmin()
  console.log("Selecting shops with null/NW/US state...")
  const candidates = await fetchCandidates(supabase)
  console.log(`  ${candidates.length} rows to attempt.\n`)

  if (candidates.length === 0) {
    console.log("Nothing to recover.")
    return
  }

  const submissionRows: (GeocodeCandidate & { name: string | null })[] = candidates.map((row) => ({
    id: row.id,
    name: row.name,
    address: normalizeAddressForGeocoding(row.address),
    city: row.city ?? "",
    state: "", // deliberately blank — the whole point is we don't trust the current value
    zip: row.zip ?? "",
  }))

  const byId = new Map(candidates.map((c) => [c.id, c]))
  const changes: BeforeAfter[] = []
  let matchedCount = 0
  let stateUnparseable = 0

  const totalChunks = Math.ceil(submissionRows.length / CHUNK_SIZE)
  for (let i = 0; i < totalChunks; i++) {
    const chunk = submissionRows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    const csv = buildAddressBatchCsv(chunk)
    const responseText = await submitAddressBatch(csv)
    const results = parseCensusResponse(responseText)

    for (const r of results) {
      if (r.matchIndicator !== "Match" || !r.matchedAddress) continue
      matchedCount++
      const newState = extractStateFromMatchedAddress(r.matchedAddress)
      if (!newState) {
        stateUnparseable++
        console.warn(`  ⚠ Could not parse a valid state from matched address: "${r.matchedAddress}" (shop ${r.id})`)
        continue
      }
      const original = byId.get(r.id)!
      changes.push({ id: r.id, name: original.name, before: original.state, after: newState })
    }

    console.log(`chunk ${i + 1}/${totalChunks} — ${results.filter((r) => r.matchIndicator === "Match").length}/${chunk.length} matched`)
    if (i < totalChunks - 1) await sleep(CHUNK_PAUSE_MS)
  }

  let written = 0
  if (!DRY_RUN) {
    for (const change of changes) {
      let query = supabase.from("shops").update({ state: change.after }).eq("id", change.id)
      query = change.before === null ? query.is("state", null) : query.eq("state", change.before)
      const { data, error } = await query.select("id")
      if (error) {
        console.error(`  write failed for ${change.id}: ${error.message}`)
        continue
      }
      if (data && data.length > 0) written++
    }
  }

  console.log("\n── State recovery summary ──────────────────")
  console.log(`Rows attempted:        ${candidates.length}`)
  console.log(`Census matches:        ${matchedCount}`)
  console.log(`State unparseable:     ${stateUnparseable}`)
  console.log(`Recoverable states:    ${changes.length}`)
  console.log(`Rows written:          ${DRY_RUN ? "0 (dry run)" : written}`)
  console.log("─────────────────────────────────────────────\n")

  if (changes.length > 0) {
    console.log(`Before/after (${changes.length} rows):`)
    for (const c of changes) {
      console.log(`  ${c.id}  ${(c.name ?? "(unnamed)").padEnd(40)}  ${String(c.before)} -> ${c.after}`)
    }
    console.log()
  } else {
    console.log("No recoverable states found this run.\n")
  }
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
