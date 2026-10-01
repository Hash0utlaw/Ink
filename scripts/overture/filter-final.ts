// overture/filter-final.ts
// READ ONLY for the database. Final pass over an insert set written by
// match-open-data.ts --output: moves piercing-only shops, ear-piercing chains
// and names with no shop word OUT of the set and appends them to
// data/overture-insert-review.csv with a reason. Never adds rows to the set.
// Run: npx tsx scripts/overture/filter-final.ts [--input data/overture-new-T3-final.csv]
//   Overwrites the input file with the filtered set.

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import { parseScriptArgs } from "../lib/args"
import { getSupabaseAdmin } from "../lib/supabase-admin"
import { fetchAll, parseCSV, writeCsv } from "../lib/cleanup-utils"

const ARGS = parseScriptArgs()
const FINAL = ARGS.input ?? "data/overture-new-T3-final.csv"
const REVIEW = "data/overture-insert-review.csv"

const BENCHMARKS: Record<string, number> = {
  KS: 152, MT: 116, SC: 207, ID: 193, OR: 645, HI: 231, UT: 298, WY: 69, ND: 62,
  MS: 113, NE: 180, IA: 269, SD: 84, GA: 602, PA: 995, NH: 160, VT: 72, ME: 126,
}

const PIERCING = /\bpierc(e|ing|ings|er)\b/i
const TATTOO_OR_INK = /\b(tattoo|tattoos|tattooing|ink)\b/i
const CHAIN = /piercing pagoda|claire'?s|\bbanter\b|\browan\b|heyrowan\.com|\bstuds\b|studs\.com/i
const SHOP_WORD =
  /\b(tattoo|tattoos|tattooing|tattooer|tat|tats|ink|inked|studio|art|arts|parlor|parlour|gallery|collective|needle|needles|skin|r|society|club|co|company)\b/i

// First rule a row fails, or null if it stays in the set.
export function finalFilterReason(name: string, website: string): string | null {
  if (PIERCING.test(name) && !TATTOO_OR_INK.test(name)) return "piercing-only"
  if (CHAIN.test(name) || CHAIN.test(website)) return "ear-piercing chain"
  if (!SHOP_WORD.test(name)) return "no shop word"
  return null
}

async function main() {
  console.log("Read only — nothing is written to the database.\n")
  const text = fs.readFileSync(FINAL, "utf-8")
  const headers = text.slice(0, text.indexOf("\n")).split(",")
  const rows = parseCSV(text)
  const reviewText = fs.readFileSync(REVIEW, "utf-8")
  const reviewHeaders = reviewText.slice(0, reviewText.indexOf("\n")).split(",")
  const review = parseCSV(reviewText)

  const kept: Record<string, string>[] = []
  const moved: Record<string, string>[] = []
  const byReason: Record<string, number> = {}
  for (const r of rows) {
    const reason = finalFilterReason(r.name, r.website)
    if (!reason) { kept.push(r); continue }
    byReason[reason] = (byReason[reason] ?? 0) + 1
    moved.push({ ...r, reason })
  }

  writeCsv(FINAL, headers, kept)
  writeCsv(REVIEW, reviewHeaders, [...review, ...moved])

  console.log(`${FINAL}: ${rows.length} rows`)
  for (const [reason, n] of Object.entries(byReason)) console.log(`  moved, ${reason.padEnd(19)} ${n}`)
  console.log(`  final count (N):           ${kept.length}`)
  console.log(`Appended ${moved.length} rows to ${REVIEW} (now ${review.length + moved.length})\n`)

  let seed = 11
  const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
  const sample = moved.slice()
  for (let i = sample.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[sample[i], sample[j]] = [sample[j], sample[i]]
  }
  console.log("15 random moved rows (reason | name | city, state | website):")
  for (const r of sample.slice(0, 15)) console.log(`  ${r.reason} | ${r.name} | ${r.city}, ${r.state} | ${r.website}`)

  const active = await fetchAll(getSupabaseAdmin(), "shops", "id, state", (q) => q.eq("is_active", true))
  const now: Record<string, number> = {}
  for (const s of active) now[String(s.state)] = (now[String(s.state)] ?? 0) + 1
  const added: Record<string, number> = {}
  for (const r of kept) added[r.state] = (added[r.state] ?? 0) + 1
  console.log(`\nBenchmark states (active now ${active.length} → ${active.length + kept.length}):`)
  console.log(`  ${"st".padEnd(3)} ${"bench".padStart(6)} ${"now".padStart(5)} ${"+new".padStart(5)} ${"after".padStart(6)} ${"cov".padStart(5)}`)
  for (const [st, bench] of Object.entries(BENCHMARKS)) {
    const b = now[st] ?? 0, n = added[st] ?? 0
    console.log(`  ${st.padEnd(3)} ${String(bench).padStart(6)} ${String(b).padStart(5)} ${("+" + n).padStart(5)} ${String(b + n).padStart(6)} ${(Math.round(((b + n) / bench) * 100) + "%").padStart(5)}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
