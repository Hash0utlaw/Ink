// overture/recover-held-back.ts
// READ ONLY for the database. Recovers real shops that filter-final.ts held
// back ONLY for "no shop word": approves a row if its website domain contains
// tattoo/tattoos/ink/tat, or its name contains studios/tattooing/tattooer/shop
// (word boundaries). Rows with any other reason (≤50m, piercing-only, chain,
// beauty/PMU, handle-like) are never approved.
// The review CSV only carries summary columns, so the full insert records
// (coords, slug, zip, …) are taken from the tier file by overture_id.
// Run: npx tsx scripts/overture/recover-held-back.ts [--input data/overture-new-T3.csv]
//   Writes data/overture-recovered.csv, then insert it with:
//   npx tsx scripts/match-open-data.ts --mode=insert --input-final=data/overture-recovered.csv [--apply]

import fs from "fs"
import { parseScriptArgs } from "../lib/args"
import { parseCSV, writeCsv } from "../lib/cleanup-utils"

const ARGS = parseScriptArgs()
const REVIEW = "data/overture-insert-review.csv"
const SOURCE = ARGS.input ?? "data/overture-new-T3.csv"
const OUT = "data/overture-recovered.csv"

const DOMAIN_WORD = /tattoo|tattoos|ink|tat/i
const NAME_WORD = /\b(studios|tattooing|tattooer|shop)\b/i

// Link-in-bio hosts say nothing about the shop ("linktr.ee" contains "ink").
const SHARED_HOST = /(^|\.)(linktr\.ee|venue\.ink)$/

// Hostname without its TLD (so "calavera.ink" doesn't match on ".ink"), or ""
// for a shared link-in-bio host.
function domainOf(website: string): string {
  if (!website) return ""
  try {
    const host = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).hostname.toLowerCase()
    if (SHARED_HOST.test(host)) return ""
    return host.replace(/\.[a-z]+$/, "")
  } catch {
    return ""
  }
}

// Why a "no shop word" row is approved, or null if it stays held back.
function approveReason(name: string, website: string): string | null {
  const domain = domainOf(website)
  if (domain && DOMAIN_WORD.test(domain)) return `domain (${domain})`
  const m = name.match(NAME_WORD)
  if (m) return `name (${m[1].toLowerCase()})`
  return null
}

function shuffled<T>(rows: T[], seed: number): T[] {
  const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
  const copy = rows.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function main() {
  console.log("Read only — nothing is written to the database.\n")
  const review = parseCSV(fs.readFileSync(REVIEW, "utf-8"))
  const sourceText = fs.readFileSync(SOURCE, "utf-8")
  const headers = sourceText.slice(0, sourceText.indexOf("\n")).split(",")
  const source = new Map(parseCSV(sourceText).map((r) => [r.overture_id, r]))

  const candidates = review.filter((r) => r.reason === "no shop word")
  const approved: Record<string, string>[] = []
  const held: Record<string, string>[] = []
  const byRule: Record<string, number> = {}
  let missing = 0
  for (const r of candidates) {
    const why = approveReason(r.name, r.website)
    if (!why) { held.push(r); continue }
    const full = source.get(r.overture_id)
    if (!full) { missing++; held.push(r); continue }
    const rule = why.startsWith("domain") ? "domain" : why
    byRule[rule] = (byRule[rule] ?? 0) + 1
    approved.push({ ...full, why })
  }

  writeCsv(OUT, headers, approved)
  console.log(`${REVIEW}: ${review.length} rows, ${candidates.length} held back only for "no shop word"`)
  console.log(`Approved: ${approved.length}`)
  for (const [rule, n] of Object.entries(byRule)) console.log(`  ${rule.padEnd(20)} ${n}`)
  console.log(`Still held back: ${held.length}${missing ? ` (incl. ${missing} approved but missing from ${SOURCE})` : ""}`)
  console.log(`Wrote ${OUT}\n`)

  console.log("25 random approved rows (rule | name | city, state | website):")
  for (const r of shuffled(approved, 5).slice(0, 25)) console.log(`  ${r.why} | ${r.name} | ${r.city}, ${r.state} | ${r.website}`)
  console.log("\n15 random rows still held back (name | city, state | website):")
  for (const r of shuffled(held, 9).slice(0, 15)) console.log(`  ${r.name} | ${r.city}, ${r.state} | ${r.website}`)
}

main()
