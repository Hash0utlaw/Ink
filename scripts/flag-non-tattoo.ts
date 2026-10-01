// flag-non-tattoo.ts
// REPORT ONLY — never writes to the database. Flags active shops whose names
// suggest they aren't tattoo studios (supply stores, brow/lash bars, salons…)
// and writes data/non-tattoo-review.csv for a human to go through.
// Run: npx tsx scripts/flag-non-tattoo.ts

import { config } from "dotenv"
config({ path: ".env.local" })

import { getSupabaseAdmin } from "./lib/supabase-admin"
import { fetchAll, writeCsv } from "./lib/cleanup-utils"

// Flagged even when the name says "tattoo" (e.g. "Tattoo Supply Co").
const ALWAYS = /\bsupply\b|\bsupplies\b/i
// Flagged only when the name doesn't contain "tattoo". Short words use \b so
// "Sacred Space Tattoo" doesn't match \bspa\b and "Brownstone" doesn't match \bbrows?\b.
const UNLESS_TATTOO =
  /microblad|permanent makeup|\bbrows?\b|\blash(es)?\b|cosmetic|\bsalon\b|\bnails?\b|\bvape\b|\bsmoke\b|\blaser\b|removal|\bbarber|med ?spa|\bspa\b/i

async function main() {
  console.log("Report only — nothing is written to the database.\n")
  const supabase = getSupabaseAdmin()
  const shops = await fetchAll(supabase, "shops", "id, name, city, state, website", (q) => q.eq("is_active", true))
  console.log(`${shops.length} active shops scanned`)

  const rows: Record<string, unknown>[] = []
  const byTerm: Record<string, number> = {}
  for (const s of shops) {
    const name = String(s.name ?? "")
    const m = name.match(ALWAYS) ?? (/tattoo/i.test(name) ? null : name.match(UNLESS_TATTOO))
    if (!m) continue
    const term = m[0].toLowerCase()
    byTerm[term] = (byTerm[term] ?? 0) + 1
    rows.push({ id: s.id, name, city: s.city, state: s.state, website: s.website, matched_term: term })
  }

  const out = writeCsv(
    "data/non-tattoo-review.csv",
    ["id", "name", "city", "state", "website", "matched_term"],
    rows.sort((a, b) => String(a.matched_term).localeCompare(String(b.matched_term)))
  )

  console.log(`\n── Summary ──`)
  console.log(`Flagged: ${rows.length}`)
  for (const [term, n] of Object.entries(byTerm).sort((a, b) => b[1] - a[1])) console.log(`  ${term.padEnd(18)} ${n}`)
  console.log(`\nWrote ${out}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
