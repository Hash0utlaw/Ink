// normalize-styles.ts
// Maps free-text artists.specialties onto the master style list (lib/styles.ts)
// and fills artists.styles and shop_styles. artists.specialties is never changed.
// Run: npx tsx scripts/normalize-styles.ts [--apply] [--max-cost 3]
//   Dry-run by default: reports what would change. --apply writes
//   artists.styles (only where it changes) and inserts missing shop_styles
//   rows, undo-logged (scripts/undo.ts restores styles and deletes the rows).
//
// 1. Distinct raw specialty values of ACTIVE artists, with artist counts.
// 2. Rules first (lib/styles.ts matchStyleSlugs). One value can give several slugs.
// 3. Values no rule matches go to Claude Haiku in batches of 100 → slugs, or
//    "generic" / "non_tattoo" / "unknown". Output is validated; a bad batch is
//    retried once. Stops if the run's AI cost passes --max-cost (default $3).
// 4. Every decision is cached in data/style-map.json (see scripts/lib/style-map.ts),
//    so re-runs only pay for new values.
// 5. Artist styles = unique slugs of their values, in STYLES order.
// 6. Shop styles = union of the shop's active artists' styles (active shops only).

import { config } from "dotenv"
config({ path: ".env.local" })

import Anthropic from "@anthropic-ai/sdk"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog, loggedUpdate } from "./lib/undo-log"
import { fetchAll, fetchIn, modeBanner, runPool, writeCsv } from "./lib/cleanup-utils"
import { withRetry } from "./lib/retry"
import {
  CATEGORIES,
  isValidResult,
  loadStyleMap,
  resolveValue,
  saveStyleMap,
  stylesFor,
  STYLE_MAP_FILE,
  type StyleMap,
  type StyleResult,
} from "./lib/style-map"
import { STYLES, isStyleSlug, normalizeStyleText } from "../lib/styles"

const ARGS = parseScriptArgs()
const MAX_COST = ARGS.maxCost ?? 3
const MODEL = "claude-haiku-4-5-20251001"
const INPUT_USD_PER_MTOK = 1
const OUTPUT_USD_PER_MTOK = 5
const AI_BATCH = 100
const AI_CONCURRENCY = 4
const NON_TATTOO_CSV = "data/non-tattoo-artists.csv"

type ArtistRow = {
  id: string
  display_name: string | null
  shop_id: string | null
  city: string | null
  state: string | null
  specialties: string[] | null
  styles: string[] | null
}

// ── AI classification ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You map tattoo artists' free-text specialty tags onto a fixed list of tattoo styles.

Canonical styles (slug: label):
${STYLES.map((s) => `${s.slug}: ${s.label}`).join("\n")}

For each numbered value, return exactly one of:
- an array of one or more slugs from the list above, when the value names or clearly implies those styles
- "generic" when it's a general tattoo term with no specific style (e.g. "tattoo artist", "all styles", "custom work", "tattoos", "consultations", "flash")
- "non_tattoo" when it's a service that isn't tattooing (e.g. permanent makeup, microblading, eyeliner, brows, lashes, piercing, laser removal)
- "unknown" when it's none of the above or you can't tell

Use only slugs from the list above, always inside an array (["geometric"], not "geometric"). Never invent a slug: if the style isn't on the list (e.g. gothic, abstract, surreal), answer "unknown". Reply with JSON only, no markdown fences or extra text:
{"results":[{"i":0,"r":["realism","black-and-grey"]},{"i":1,"r":"generic"}]}
Include every index exactly once.`

const usage = { calls: 0, input: 0, output: 0, cost: 0 }

class CostCapError extends Error {}

// Parses one reply. Returns null only when the reply isn't the expected JSON
// shape; otherwise the valid results by index (undefined where an item was
// missing or invalid) plus a note for each problem.
function parseBatch(text: string, n: number): { results: (StyleResult | undefined)[]; problems: string[] } | null {
  let parsed: { results?: { i?: unknown; r?: unknown }[] }
  try {
    parsed = JSON.parse(text.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, ""))
  } catch {
    return null
  }
  if (!Array.isArray(parsed?.results)) return null
  const results = new Array<StyleResult | undefined>(n).fill(undefined)
  const problems: string[] = []
  for (const item of parsed.results) {
    const i = Number(item?.i)
    if (!Number.isInteger(i) || i < 0 || i >= n) {
      problems.push(`bad index ${JSON.stringify(item?.i)}`)
      continue
    }
    // Lenient on shape, strict on content: a bare slug becomes [slug], slugs not
    // on the master list are dropped, and if none are left the value is "unknown".
    let r: unknown = item.r
    if (typeof r === "string" && isStyleSlug(r)) r = [r]
    if (Array.isArray(r)) {
      const kept = Array.from(new Set(r)).filter(isStyleSlug)
      r = kept.length > 0 ? kept : r.length > 0 ? "unknown" : r
    }
    if (!isValidResult(r)) {
      problems.push(`#${i} invalid result ${JSON.stringify(item.r)}`)
      continue
    }
    results[i] = r
  }
  const missing = results.filter((r) => r === undefined).length - problems.filter((p) => p.startsWith("#")).length
  if (missing > 0) problems.push(`${missing} missing`)
  return { results, problems }
}

async function askOnce(client: Anthropic, values: string[]) {
  if (usage.cost > MAX_COST) throw new CostCapError(`AI cost $${usage.cost.toFixed(4)} passed the $${MAX_COST} cap`)
  // The SDK retries 429/5xx/connection errors itself (2 retries).
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Values:\n${values.map((v, i) => `${i}. ${JSON.stringify(v)}`).join("\n")}` }],
  })
  const cost = (msg.usage.input_tokens * INPUT_USD_PER_MTOK + msg.usage.output_tokens * OUTPUT_USD_PER_MTOK) / 1_000_000
  usage.calls++
  usage.input += msg.usage.input_tokens
  usage.output += msg.usage.output_tokens
  usage.cost += cost
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("")
  const parsed = msg.stop_reason === "max_tokens" ? null : parseBatch(text, values.length)
  const note = !parsed
    ? ` — bad JSON (${msg.stop_reason})`
    : parsed.problems.length
      ? ` — ${parsed.problems.length} problem(s): ${parsed.problems.slice(0, 3).join("; ")}`
      : ""
  console.log(`  batch of ${values.length}: in ${msg.usage.input_tokens} / out ${msg.usage.output_tokens} — $${cost.toFixed(4)} (running $${usage.cost.toFixed(4)})${note}`)
  return parsed
}

// Classifies a batch. Bad JSON → the whole batch is retried once; items that
// came back missing or invalid → just those are retried once. Anything still
// failing is returned as undefined (left undecided this run).
async function classifyBatch(client: Anthropic, values: string[]): Promise<(StyleResult | undefined)[]> {
  let parsed = await askOnce(client, values)
  if (!parsed) parsed = await askOnce(client, values)
  if (!parsed) return new Array(values.length).fill(undefined)
  const results = parsed.results
  const retry = values.map((_, i) => i).filter((i) => results[i] === undefined)
  if (retry.length > 0) {
    const again = await askOnce(client, retry.map((i) => values[i]))
    retry.forEach((idx, j) => {
      if (again?.results[j] !== undefined) results[idx] = again.results[j]
    })
  }
  return results
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sameArray(a: readonly string[] | null | undefined, b: readonly string[]): boolean {
  const x = a ?? []
  return x.length === b.length && x.every((v, i) => v === b[i])
}

function sample<T>(items: T[], n: number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

function pct(n: number, total: number): string {
  return total ? `${((n / total) * 100).toFixed(1)}%` : "0%"
}

function describe(r: StyleResult): string {
  return Array.isArray(r) ? r.join(", ") : r
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  modeBanner(ARGS.apply)
  const supabase = getSupabaseAdmin()

  // 1. Active artists and their distinct raw values.
  const artists = await withRetry("fetch artists", () =>
    fetchAll<ArtistRow>(supabase, "artists", "id, display_name, shop_id, city, state, specialties, styles", (q) =>
      q.eq("is_active", true)
    )
  )
  const counts = new Map<string, number>() // raw value → active artists using it
  for (const a of artists) {
    for (const raw of new Set((a.specialties ?? []).map((v) => v.trim()).filter(Boolean))) {
      counts.set(raw, (counts.get(raw) ?? 0) + 1)
    }
  }
  console.log(`Active artists: ${artists.length}; distinct specialty values: ${counts.size}`)

  // 2. Rules (and cached ai/manual decisions).
  const map: StyleMap = loadStyleMap()
  const undecided: string[] = []
  for (const raw of counts.keys()) {
    const entry = resolveValue(raw, map)
    if (entry) map[raw] = entry
    else undecided.push(raw)
  }

  // 3. AI for the rest — one request per normalized form, shared by its raw variants.
  const byNorm = new Map<string, string[]>()
  for (const raw of undecided) {
    const key = normalizeStyleText(raw) || raw.toLowerCase()
    byNorm.set(key, [...(byNorm.get(key) ?? []), raw])
  }
  const toAsk = Array.from(byNorm.values())
  console.log(`Undecided values: ${undecided.length} (${toAsk.length} after normalizing) → Claude Haiku in batches of ${AI_BATCH}`)

  let aiFailed = 0
  let stoppedForCost = false
  if (toAsk.length > 0) {
    const client = new Anthropic()
    const batches: string[][][] = []
    for (let i = 0; i < toAsk.length; i += AI_BATCH) batches.push(toAsk.slice(i, i + AI_BATCH))
    try {
      await runPool(batches, AI_CONCURRENCY, async (batch) => {
        const results = await classifyBatch(client, batch.map((group) => group[0]))
        batch.forEach((group, i) => {
          const result = results[i]
          if (result === undefined) {
            aiFailed++
            return
          }
          for (const raw of group) map[raw] = { result, source: "ai" }
        })
        saveStyleMap(map)
      })
    } catch (e) {
      if (!(e instanceof CostCapError)) throw e
      stoppedForCost = true
      console.error(`\nSTOPPED: ${e.message}. Decisions so far are saved in ${STYLE_MAP_FILE}.`)
    }
  }
  saveStyleMap(map)
  if (stoppedForCost) process.exit(1)

  // 5. Artist styles.
  const newStyles = new Map<string, string[]>()
  for (const a of artists) newStyles.set(a.id, stylesFor(a.specialties, map))

  // 6. Shop styles: union over active artists at active shops.
  const shopIds = Array.from(new Set(artists.map((a) => a.shop_id).filter((s): s is string => !!s)))
  const shops = await withRetry("fetch shops", () =>
    fetchIn<{ id: string; name: string | null; is_active: boolean | null }>(supabase, "shops", "id, name, is_active", "id", shopIds)
  )
  const activeShops = new Map(shops.filter((s) => s.is_active).map((s) => [s.id, s]))
  const shopStyles = new Map<string, Set<string>>()
  for (const a of artists) {
    if (!a.shop_id || !activeShops.has(a.shop_id)) continue
    const styles = newStyles.get(a.id)!
    if (styles.length === 0) continue
    if (!shopStyles.has(a.shop_id)) shopStyles.set(a.shop_id, new Set())
    for (const s of styles) shopStyles.get(a.shop_id)!.add(s)
  }

  // ── Report ──
  const values = Array.from(counts.keys())
  const entryOf = (raw: string) => map[raw]
  const ruleValues = values.filter((v) => entryOf(v)?.source === "rule")
  const aiValues = values.filter((v) => entryOf(v)?.source === "ai")
  const manualValues = values.filter((v) => entryOf(v)?.source === "manual")
  const catCount = (c: string) => values.filter((v) => entryOf(v)?.result === c).length

  console.log(`\n══ Values (${values.length} distinct) ══`)
  console.log(`  matched by rule:   ${ruleValues.length}`)
  console.log(`  decided by AI:     ${aiValues.length}`)
  if (manualValues.length) console.log(`  manual:            ${manualValues.length}`)
  if (aiFailed) console.log(`  AI failed twice:   ${aiFailed} values — left undecided, add nothing`)
  for (const c of CATEGORIES) console.log(`  ${c.padEnd(18)} ${catCount(c)}`)
  console.log(`  → map to ≥1 style: ${values.filter((v) => Array.isArray(entryOf(v)?.result)).length}`)

  const withStyle = artists.filter((a) => newStyles.get(a.id)!.length > 0).length
  console.log(`\n══ Artists ══`)
  console.log(`  active artists:          ${artists.length}`)
  console.log(`  with ≥1 specialty value: ${artists.filter((a) => (a.specialties ?? []).some((v) => v.trim())).length}`)
  console.log(`  get ≥1 style:            ${withStyle} (${pct(withStyle, artists.length)})`)
  const changed = artists.filter((a) => !sameArray(a.styles, newStyles.get(a.id)!))
  console.log(`  styles would change:     ${changed.length}`)
  console.log(`\n  Artists per style:`)
  for (const s of STYLES) {
    const n = artists.filter((a) => newStyles.get(a.id)!.includes(s.slug)).length
    console.log(`    ${s.label.padEnd(22)} ${String(n).padStart(6)}`)
  }

  const shopRows = Array.from(shopStyles.entries()).flatMap(([shop_id, set]) => Array.from(set).map((style) => ({ shop_id, style })))
  console.log(`\n══ Shops ══`)
  console.log(`  active shops with active artists: ${new Set(artists.map((a) => a.shop_id).filter((s) => s && activeShops.has(s))).size}`)
  console.log(`  get ≥1 style:                     ${shopStyles.size}`)
  console.log(`  shop_styles rows (total):         ${shopRows.length}`)

  console.log(`\n══ 40 random mappings ══`)
  const picks = [...sample(ruleValues, 20), ...sample([...aiValues, ...manualValues], 20)]
  const fill = sample(values.filter((v) => !picks.includes(v) && entryOf(v)), 40 - picks.length)
  for (const v of [...picks, ...fill]) {
    const e = entryOf(v)
    console.log(`  [${e.source.padEnd(4)}] ${JSON.stringify(v).slice(0, 48).padEnd(50)} → ${describe(e.result)}`)
  }

  console.log(`\n══ 40 most common values ending generic or unknown ══`)
  const unresolved = values
    .filter((v) => entryOf(v)?.result === "generic" || entryOf(v)?.result === "unknown")
    .sort((a, b) => counts.get(b)! - counts.get(a)!)
    .slice(0, 40)
  for (const v of unresolved) {
    console.log(`  ${String(counts.get(v)).padStart(5)}  ${String(entryOf(v).result).padEnd(8)} ${JSON.stringify(v).slice(0, 70)}`)
  }

  // Artists whose values are ALL non_tattoo — review only, nothing changes.
  const nonTattoo = artists.filter((a) => {
    const vals = (a.specialties ?? []).map((v) => v.trim()).filter(Boolean)
    return vals.length > 0 && vals.every((v) => entryOf(v)?.result === "non_tattoo")
  })
  const shopNames = new Map(shops.map((s) => [s.id, s.name]))
  writeCsv(
    NON_TATTOO_CSV,
    ["artist_id", "name", "shop", "city", "state", "raw_values"],
    nonTattoo.map((a) => ({
      artist_id: a.id,
      name: a.display_name,
      shop: a.shop_id ? shopNames.get(a.shop_id) ?? "" : "",
      city: a.city,
      state: a.state,
      raw_values: (a.specialties ?? []).join(" | "),
    }))
  )
  console.log(`\n══ Non-tattoo only ══`)
  console.log(`  ${nonTattoo.length} artists → ${NON_TATTOO_CSV} (review only)`)

  console.log(`\n══ Cost ══`)
  console.log(`  ${usage.calls} calls, ${usage.input} input / ${usage.output} output tokens — $${usage.cost.toFixed(4)} (cap $${MAX_COST})`)
  console.log(`  decisions cached in ${STYLE_MAP_FILE} (${Object.keys(map).length} entries)`)

  if (!ARGS.apply) {
    console.log(`\nDry run — nothing written to the database. Pass --apply to write (undo-logged).`)
    return
  }

  // ── Apply ──
  const undo = new UndoLog("normalize-styles")
  let updated = 0
  await runPool(changed, 10, async (a) => {
    await withRetry(`update artist ${a.id}`, () =>
      loggedUpdate(supabase, undo, "artists", a.id, { styles: a.styles ?? [] }, { styles: newStyles.get(a.id)! })
    )
    updated++
  })

  // shop_styles has no id column (primary key is shop_id + style), so page it here rather than with fetchAll.
  const have = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const data = await withRetry("fetch shop_styles", async () => {
      const res = await supabase.from("shop_styles").select("shop_id, style").order("shop_id").order("style").range(from, from + 999)
      if (res.error) throw new Error(res.error.message)
      return res.data
    })
    for (const r of data ?? []) have.add(`${r.shop_id}|${r.style}`)
    if (!data || data.length < 1000) break
  }
  const toInsert = shopRows.filter((r) => !have.has(`${r.shop_id}|${r.style}`))
  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500)
    undo.append(
      chunk.map((r) => ({ table: "shop_styles", id: `${r.shop_id}|${r.style}`, field: "row", old_value: null, new_value: r, op: "insert" as const }))
    )
    await withRetry(`insert shop_styles ${i / 500 + 1}`, async () => {
      // ignoreDuplicates: a retried chunk that already landed is a no-op.
      const { error } = await supabase.from("shop_styles").upsert(chunk, { onConflict: "shop_id,style", ignoreDuplicates: true })
      if (error) throw new Error(error.message)
    })
  }
  console.log(`\nUpdated ${updated} artists' styles; inserted ${toInsert.length} shop_styles rows. Undo log: ${undo.file} (${undo.entries} entries)`)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
