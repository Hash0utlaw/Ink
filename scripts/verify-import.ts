// verify-import.ts
// Post-import verification (Task 5). Reuses computeReport() from
// scripts/lib/audit.ts (the exact same computation audit-coverage.ts uses)
// against the CURRENT shops table, diffs it against the most recent
// data/coverage-history/*.json snapshot, flags states where the total row
// count grew but the usable count didn't move with it, and confirms no
// pre-existing row was modified during the import window.
//
// Writes NOTHING to Supabase — every call here is a `.select()`.
//
// The "zero pre-existing rows modified" check needs BOTH created_at and
// updated_at, not just updated_at > importStart: a newly *inserted* row also
// has updated_at > importStart (that's just when it was created), so that
// check alone would never read zero even on a clean run. The correct check —
// updated_at > importStart AND created_at < importStart — isolates rows that
// existed before the import window but were touched during/after it, which
// should be impossible under `ignoreDuplicates: true` (ON CONFLICT DO
// NOTHING never touches the conflicting row).
//
// Run: npx tsx scripts/verify-import.ts [--baseline path/to/coverage-report.json]

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { fetchAllRows, computeReport, type ShopRow, type AuditReport } from "./lib/audit"

const supabase = getSupabaseAdmin()

const DATA_DIR = path.resolve("data")
const HISTORY_DIR = path.join(DATA_DIR, "coverage-history")
const RUN_LOG_DIR = path.join(DATA_DIR, "import-runs")

const FLAT_GROWTH_RATIO_THRESHOLD = 0.5

function getRawArg(flag: string): string | null {
  const argv = process.argv.slice(2)
  const idx = argv.indexOf(flag)
  if (idx === -1 || idx + 1 >= argv.length) return null
  return argv[idx + 1]
}

function findLatestBaseline(): string | null {
  if (!fs.existsSync(HISTORY_DIR)) return null
  const files = fs.readdirSync(HISTORY_DIR).filter((f) => f.endsWith(".json"))
  if (files.length === 0) return null
  files.sort() // ISO-derived filenames sort chronologically
  return path.join(HISTORY_DIR, files[files.length - 1])
}

function loadReport(file: string): AuditReport {
  return JSON.parse(fs.readFileSync(file, "utf-8"))
}

interface RunLogEntry {
  script: string
  startedAt: string
}

// Earliest import run-log started after the baseline snapshot was generated
// — that's the start of the import window we're verifying.
function findImportStart(sinceISO: string): string | null {
  if (!fs.existsSync(RUN_LOG_DIR)) return null
  const since = new Date(sinceISO).getTime()
  let earliest: string | null = null
  for (const f of fs.readdirSync(RUN_LOG_DIR)) {
    if (!f.endsWith(".json")) continue
    const log = JSON.parse(fs.readFileSync(path.join(RUN_LOG_DIR, f), "utf-8")) as RunLogEntry
    const t = new Date(log.startedAt).getTime()
    if (t > since && (!earliest || t < new Date(earliest).getTime())) earliest = log.startedAt
  }
  return earliest
}

async function countModifiedPreExisting(table: string, importStart: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .gt("updated_at", importStart)
    .lt("created_at", importStart)
  if (error) {
    console.error(`  Error checking ${table}:`, error.message)
    return -1
  }
  return count ?? 0
}

async function main() {
  const baselinePath = getRawArg("--baseline") ?? findLatestBaseline()
  if (!baselinePath || !fs.existsSync(baselinePath)) {
    console.error("No baseline report found. Run audit-coverage.ts before AND after your import, or pass --baseline <path to a coverage-report snapshot>.")
    process.exit(1)
  }
  console.log(`Baseline: ${baselinePath}`)
  const baseline = loadReport(baselinePath)

  console.log("Fetching current shops (read-only)...")
  const SHOP_COLUMNS =
    "id, name, slug, address, city, state, zip, phone, website, latitude, longitude, place_id, rating, review_count, hours, description, cover_image_url, created_at, updated_at"
  const shops = await fetchAllRows<ShopRow>(supabase, "shops", SHOP_COLUMNS)
  const current = computeReport(shops)

  // ── Per-state diff ──
  const baselineByState = new Map(baseline.states.buckets.map((b) => [b.state, b]))
  const stateDiffs = current.states.buckets.map((cur) => {
    const base = baselineByState.get(cur.state) ?? { total: 0, usable: 0 }
    return {
      state: cur.state,
      deltaTotal: cur.total - base.total,
      deltaUsable: cur.usable - base.usable,
      currentTotal: cur.total,
      currentUsable: cur.usable,
    }
  })

  const grew = stateDiffs.filter((d) => d.deltaTotal > 0).sort((a, b) => b.deltaTotal - a.deltaTotal)
  const flatStates = grew
    .filter((d) => d.deltaUsable / d.deltaTotal < FLAT_GROWTH_RATIO_THRESHOLD)
    .sort((a, b) => a.deltaUsable / a.deltaTotal - b.deltaUsable / b.deltaTotal)

  // ── Modification check ──
  const importStart = findImportStart(baseline.generatedAt)
  let modifiedCounts: Record<string, number> | null = null
  if (importStart) {
    console.log(`\nChecking for modified pre-existing rows since import start ${importStart}...`)
    modifiedCounts = {
      shops: await countModifiedPreExisting("shops", importStart),
      artists: await countModifiedPreExisting("artists", importStart),
      shop_artists: await countModifiedPreExisting("shop_artists", importStart),
    }
  } else {
    console.log("\nNo import run-log found after the baseline snapshot — skipping the pre-existing-row-modification check.")
  }

  // ── Console report ──
  console.log(`\n${"=".repeat(60)}`)
  console.log("VERIFY REPORT")
  console.log("=".repeat(60))
  console.log(`Baseline generated: ${baseline.generatedAt}`)
  console.log(`Current generated:  ${current.generatedAt}`)
  const totalDelta = current.totals.totalShops - baseline.totals.totalShops
  const usableDelta = current.totals.usableShops - baseline.totals.usableShops
  console.log(`\nTotal shops:  ${baseline.totals.totalShops} → ${current.totals.totalShops} (${totalDelta >= 0 ? "+" : ""}${totalDelta})`)
  console.log(`Usable shops: ${baseline.totals.usableShops} → ${current.totals.usableShops} (${usableDelta >= 0 ? "+" : ""}${usableDelta})`)

  console.log(`\nStates where rows were added:`)
  if (grew.length === 0) console.log("  (none)")
  for (const d of grew) {
    console.log(`  ${d.state}: total +${d.deltaTotal}, usable +${d.deltaUsable} (now ${d.currentTotal} total / ${d.currentUsable} usable)`)
  }

  console.log(`\n⚠ States where total grew but usable barely/didn't move (<${Math.round(FLAT_GROWTH_RATIO_THRESHOLD * 100)}% of new rows usable):`)
  if (flatStates.length === 0) console.log("  (none — good)")
  for (const d of flatStates) {
    console.log(`  ${d.state}: total +${d.deltaTotal}, usable +${d.deltaUsable}`)
  }

  console.log(`\nPre-existing row modification check:`)
  if (modifiedCounts) {
    for (const [table, count] of Object.entries(modifiedCounts)) {
      const flag = count > 0 ? " ⚠ NON-ZERO — investigate immediately" : count === 0 ? " ✓" : " (error checking)"
      console.log(`  ${table}: ${count}${flag}`)
    }
  } else {
    console.log("  Not checked (no run-log).")
  }

  // ── Write timestamped report ──
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const outPath = path.join(DATA_DIR, `verify-report-${new Date().toISOString().replace(/[:.]/g, "-")}.md`)
  const lines: string[] = []
  lines.push(`# Verify Import Report`)
  lines.push(``)
  lines.push(`Baseline: ${baseline.generatedAt}  •  Current: ${current.generatedAt}`)
  lines.push(``)
  lines.push(`Total shops: ${baseline.totals.totalShops} → ${current.totals.totalShops}`)
  lines.push(`Usable shops: ${baseline.totals.usableShops} → ${current.totals.usableShops}`)
  lines.push(``)
  lines.push(`## States with new rows`)
  lines.push(``)
  lines.push(`| State | Δ Total | Δ Usable | Current Total | Current Usable |`)
  lines.push(`|---|---:|---:|---:|---:|`)
  for (const d of grew) lines.push(`| ${d.state} | +${d.deltaTotal} | +${d.deltaUsable} | ${d.currentTotal} | ${d.currentUsable} |`)
  lines.push(``)
  lines.push(`## Flagged: total grew, usable flat`)
  lines.push(``)
  if (flatStates.length === 0) {
    lines.push(`None.`)
  } else {
    lines.push(`| State | Δ Total | Δ Usable |`)
    lines.push(`|---|---:|---:|`)
    for (const d of flatStates) lines.push(`| ${d.state} | +${d.deltaTotal} | +${d.deltaUsable} |`)
  }
  lines.push(``)
  lines.push(`## Pre-existing row modification check`)
  lines.push(``)
  if (modifiedCounts) {
    lines.push(`| Table | Modified pre-existing rows |`)
    lines.push(`|---|---:|`)
    for (const [table, count] of Object.entries(modifiedCounts)) lines.push(`| ${table} | ${count} |`)
  } else {
    lines.push(`Not checked — no import run-log found after the baseline snapshot.`)
  }
  fs.writeFileSync(outPath, lines.join("\n"))
  console.log(`\n✓ Wrote ${outPath}`)

  const anyModified = modifiedCounts && Object.values(modifiedCounts).some((c) => c > 0)
  if (anyModified) {
    console.error("\n✗ FAILED: pre-existing rows were modified. This should never happen under insert-only upserts — investigate immediately.")
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
