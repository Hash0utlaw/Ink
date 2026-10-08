// propose-non-tattoo-deactivation.ts
// REPORT ONLY — never writes to the database. Narrows data/non-tattoo-review.csv
// to a proposed deactivation list:
//   - supply stores (\bsupply\b|\bsupplies\b) and PMU / brow / lash / salon /
//     nail / vape / laser-removal names, in both cases only when the name does
//     NOT contain tattoo or ink anywhere (substring, so "Tattoo & Supply" and
//     "Inkredible Brows" stay).
// Writes data/non-tattoo-deactivate-proposed.csv with decision = "remove" for
// a human to edit before anything is applied.
// Run: npx tsx scripts/propose-non-tattoo-deactivation.ts

import fs from "fs"
import { parseCSV, writeCsv } from "./lib/cleanup-utils"

const INPUT = "data/non-tattoo-review.csv"
const OUT = "data/non-tattoo-deactivate-proposed.csv"

const SUPPLY = /\b(supply|supplies)\b/i
const NON_TATTOO =
  /(microblad|permanent makeup|\bpmu\b|\bbrows?\b|\blash(es)?\b|cosmetic|\bsalon\b|\bnails?\b|\bvape\b|\bsmoke\b|\blaser\b|removal|\bmed ?spa\b)/i
const TATTOO_WORD = /tattoo|ink/i

// The term that puts a name on the list, or null if it stays.
function proposeTerm(name: string): string | null {
  if (TATTOO_WORD.test(name)) return null
  const supply = name.match(SUPPLY)
  if (supply) return supply[1].toLowerCase()
  const m = name.match(NON_TATTOO)
  if (!m) return null
  const term = m[1].toLowerCase()
  if (/^brows?$/.test(term)) return "brow(s)"
  if (/^lash/.test(term)) return "lash(es)"
  if (/^nails?$/.test(term)) return "nail(s)"
  if (/^med ?spa$/.test(term)) return "med spa"
  return term
}

function main() {
  console.log("Report only — nothing is written to the database.\n")
  const text = fs.readFileSync(INPUT, "utf-8")
  const headers = text.slice(0, text.indexOf("\n")).split(",")
  const rows = parseCSV(text)

  const proposed: Record<string, string>[] = []
  const byTerm: Record<string, number> = {}
  for (const r of rows) {
    const term = proposeTerm(r.name)
    if (!term) continue
    byTerm[term] = (byTerm[term] ?? 0) + 1
    proposed.push({ ...r, proposed_term: term, decision: "remove" })
  }

  writeCsv(OUT, [...headers, "proposed_term", "decision"], proposed)
  console.log(`${INPUT}: ${rows.length} rows → ${proposed.length} proposed for deactivation`)
  for (const [term, n] of Object.entries(byTerm).sort((a, b) => b[1] - a[1])) console.log(`  ${term.padEnd(16)} ${n}`)
  console.log(`Wrote ${OUT}\n`)

  let seed = 13
  const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
  const sample = proposed.slice()
  for (let i = sample.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[sample[i], sample[j]] = [sample[j], sample[i]]
  }
  console.log("25 random proposed rows (term | name | city, state | website):")
  for (const r of sample.slice(0, 25)) console.log(`  ${r.proposed_term} | ${r.name} | ${r.city}, ${r.state} | ${r.website}`)
}

main()
