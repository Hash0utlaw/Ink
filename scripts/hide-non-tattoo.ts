// hide-non-tattoo.ts
// Hides (is_active = false, never deletes) listings that aren't tattoo work:
//   A) active artists whose specialties are ALL classified "non_tattoo" in
//      data/style-map.json (PMU, microblading, brows, lashes, piercing,
//      laser/removal, SMP…). Medical/paramedical values are "generic" in the
//      map, so an artist with any of them never qualifies; a name check below
//      backs that up. Artists with no specialties are left alone.
//   B) active shops listed in data/non-tattoo-deactivate-proposed.csv
//      (decision = remove; rebuilt from data/non-tattoo-review.csv by
//      propose-non-tattoo-deactivation.ts when missing), except a shop with at
//      least one active artist that has a real tattoo style in artists.styles.
//      The active artists of each hidden shop are hidden too.
// Prints counts, 20 random samples per group, and the hidden shops rated over
// 4.5 with 100+ reviews so big names can be sanity-checked.
// Run: npx tsx scripts/hide-non-tattoo.ts [--apply]
//   Dry-run by default; --apply writes (undo-logged).

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import { execFileSync } from "child_process"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog, loggedUpdate } from "./lib/undo-log"
import { fetchAll, fetchIn, modeBanner, parseCSV, runPool } from "./lib/cleanup-utils"
import { withRetry } from "./lib/retry"
import { loadStyleMap, resolveValue } from "./lib/style-map"
import { isStyleSlug } from "../lib/styles"

const ARGS = parseScriptArgs()
const PROPOSED = "data/non-tattoo-deactivate-proposed.csv"
const MEDICAL = /medic/i // medical, paramedical

type Row = Record<string, unknown>

function hasRealStyle(a: Row): boolean {
  return Array.isArray(a.styles) && a.styles.some((s) => isStyleSlug(String(s)))
}

// Seeded shuffle so a dry run and the apply that follows show the same samples.
function sample<T>(items: T[], n: number): T[] {
  let seed = 13
  const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.slice(0, n)
}

async function main() {
  modeBanner(ARGS.apply)
  const supabase = getSupabaseAdmin()
  const map = loadStyleMap()

  // ── A: artists whose every specialty is non_tattoo ──
  const artists = await withRetry("fetch artists", () =>
    fetchAll(supabase, "artists", "id, display_name, city, state, shop_id, specialties, styles, is_active", (q) =>
      q.eq("is_active", true)
    )
  )
  let skippedStyled = 0
  const groupA = artists.filter((a) => {
    const values = ((a.specialties as string[] | null) ?? []).map((v) => v.trim()).filter(Boolean)
    if (values.length === 0) return false
    if (values.some((v) => MEDICAL.test(v))) return false
    if (!values.every((v) => resolveValue(v, map)?.result === "non_tattoo")) return false
    if (hasRealStyle(a)) {
      skippedStyled++
      return false
    }
    return true
  })

  // ── B: proposed non-tattoo shops ──
  if (!fs.existsSync(PROPOSED)) {
    console.log(`${PROPOSED} not found — rebuilding it with propose-non-tattoo-deactivation.ts\n`)
    execFileSync("npx", ["tsx", "scripts/propose-non-tattoo-deactivation.ts"], { stdio: "inherit" })
  }
  const proposedIds = parseCSV(fs.readFileSync(PROPOSED, "utf-8"))
    .filter((r) => r.decision === "remove" && r.id)
    .map((r) => r.id)
  const proposedShops = (
    await withRetry("fetch shops", () =>
      fetchIn(supabase, "shops", "id, name, city, state, rating, review_count, is_active", "id", proposedIds)
    )
  ).filter((s) => s.is_active === true)

  const artistsByShop = new Map<string, Row[]>()
  for (const a of artists) {
    if (!a.shop_id) continue
    const list = artistsByShop.get(String(a.shop_id)) ?? []
    list.push(a)
    artistsByShop.set(String(a.shop_id), list)
  }
  const keptForArtists: Row[] = []
  const groupB = proposedShops.filter((s) => {
    const keep = (artistsByShop.get(String(s.id)) ?? []).some(hasRealStyle)
    if (keep) keptForArtists.push(s)
    return !keep
  })
  const groupAIds = new Set(groupA.map((a) => String(a.id)))
  const groupBArtists = groupB
    .flatMap((s) => artistsByShop.get(String(s.id)) ?? [])
    .filter((a) => !groupAIds.has(String(a.id)))

  // ── Report ──
  console.log(`Active artists scanned: ${artists.length}`)
  console.log(`A) artists with only non_tattoo specialties: ${groupA.length}`)
  console.log(`   (left alone: ${skippedStyled} that also have a real tattoo style)`)
  console.log(`B) proposed shops in CSV: ${proposedIds.length}, still active: ${proposedShops.length}`)
  console.log(`   kept (an active artist has a real tattoo style): ${keptForArtists.length}`)
  console.log(`   shops to hide: ${groupB.length}`)
  console.log(`   their active artists to hide (not already in A): ${groupBArtists.length}`)

  console.log(`\nA samples (name | city, state | specialties):`)
  for (const a of sample(groupA, 20))
    console.log(`  ${a.display_name} | ${a.city}, ${a.state} | ${((a.specialties as string[]) ?? []).join("; ")}`)
  console.log(`\nB shop samples (name | city, state | rating / reviews):`)
  for (const s of sample(groupB, 20)) console.log(`  ${s.name} | ${s.city}, ${s.state} | ${s.rating ?? "-"} / ${s.review_count ?? 0}`)
  console.log(`\nB artist samples (name | specialties | styles):`)
  for (const a of sample(groupBArtists, 20))
    console.log(`  ${a.display_name} | ${((a.specialties as string[]) ?? []).join("; ")} | ${((a.styles as string[]) ?? []).join(", ")}`)
  console.log(`\nShops kept because an artist has a real tattoo style:`)
  for (const s of keptForArtists) console.log(`  ${s.name} | ${s.city}, ${s.state}`)

  const big = groupB
    .filter((s) => Number(s.rating ?? 0) > 4.5 && Number(s.review_count ?? 0) >= 100)
    .sort((x, y) => Number(y.review_count) - Number(x.review_count))
  console.log(`\nShops to hide rated over 4.5 with 100+ reviews: ${big.length}`)
  for (const s of big) console.log(`  ${s.name} | ${s.city}, ${s.state} | ${s.rating} / ${s.review_count}`)

  const totalArtists = groupA.length + groupBArtists.length
  console.log(`\nTotals: hide ${groupB.length} shops and ${totalArtists} artists (${groupA.length} A + ${groupBArtists.length} via B)`)

  if (!ARGS.apply) {
    console.log("\nDry run — nothing written. Pass --apply to write (undo-logged).")
    return
  }

  const undo = new UndoLog("hide-non-tattoo")
  let shopsDone = 0
  let artistsDone = 0
  await runPool(groupB, 10, async (s) => {
    await withRetry(`hide shop ${s.id}`, () => loggedUpdate(supabase, undo, "shops", String(s.id), s, { is_active: false }))
    shopsDone++
  })
  await runPool([...groupA, ...groupBArtists], 10, async (a) => {
    await withRetry(`hide artist ${a.id}`, () =>
      loggedUpdate(supabase, undo, "artists", String(a.id), a, { is_active: false })
    )
    artistsDone++
  })
  console.log(`\nHid ${shopsDone} shops and ${artistsDone} artists. Undo log: ${undo.file} (${undo.entries} entries)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
