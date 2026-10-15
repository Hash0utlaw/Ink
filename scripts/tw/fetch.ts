// scripts/tw/fetch.ts — research only, no database access.
// Fetches every US profile in data/tw/urls.jsonl (raw pages cached in
// data/cache/tattooswizard/), then parses them all into data/tw/profiles.jsonl.
// Run:
//   npx tsx scripts/tw/fetch.ts --limit 50   test run: a mix of big artists, small
//                                            artists, studios and no-Instagram profiles;
//                                            prints fill rates + 5 parsed examples
//   npx tsx scripts/tw/fetch.ts              full run (resumes from the cache + checkpoint)
//   npx tsx scripts/tw/fetch.ts --parse-only re-parse the cache without any network
// Flags: --rps 1 (max 1.5), --refresh (refetch cached pages)

import fs from "fs"
import path from "path"
import { PROFILES_FILE, TW_DIR, URLS_FILE, type UrlRow, flag, numOption, readJson, readJsonl, writeJson, writeJsonl } from "./lib/common"
import { PoliteFetcher, Progress, StopError, cachePath, fmtDuration, readCache, runQueue } from "./lib/fetcher"
import { fillRates } from "./lib/fill"
import { type Profile, parseProfile } from "./lib/parse"

const LIMIT = numOption("--limit")
const PARSE_ONLY = flag("--parse-only")
const REFRESH = flag("--refresh")
const CHECKPOINT = path.join(TW_DIR, LIMIT ? "fetch-checkpoint.sample.json" : "fetch-checkpoint.json")
const SAMPLE_FILE = path.join(TW_DIR, "sample-urls.json")
const fetcher = new PoliteFetcher(Math.min(numOption("--rps") ?? 1, 1.5))

interface Checkpoint {
  started_at: string
  run_seconds: number // summed across runs
  fetched: number
  failed: Record<string, { status: number; error: string }>
  stopped: string | null
}

// Deterministic shuffle so the sample is the same on every rerun.
function seededShuffle<T>(items: T[], seed = 42): T[] {
  const out = [...items]
  let s = seed
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2 ** 31
    const j = s % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function fetchedAt(url: string): string {
  const file = cachePath(url)
  return fs.existsSync(file) ? fs.statSync(file).mtime.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
}

function parseCached(url: string): Profile | null {
  const html = readCache(url)
  return html === null ? null : parseProfile(html, url, fetchedAt(url))
}

function printReport(profiles: Profile[]): void {
  console.log(`\nFill rate (${profiles.length} profiles parsed):`)
  for (const r of fillRates(profiles)) {
    console.log(`  ${r.field.padEnd(26)} ${r.pct.toFixed(1).padStart(5)}%  (${r.filled}/${r.of})`)
  }
  const methods: Record<string, Record<string, number>> = {}
  for (const p of profiles) for (const [f, m] of Object.entries(p.methods)) ((methods[f] ??= {})[m] = (methods[f][m] ?? 0) + 1)
  console.log("\nParse method per field:")
  for (const [f, m] of Object.entries(methods)) console.log(`  ${f.padEnd(22)} ${Object.entries(m).map(([k, v]) => `${k} ${v}`).join(", ")}`)
  const studioConf: Record<string, number> = {}
  for (const p of profiles) if (p.studio_confidence) studioConf[p.studio_confidence] = (studioConf[p.studio_confidence] ?? 0) + 1
  console.log(`\nStudio confidence: ${JSON.stringify(studioConf)}`)
  console.log(`Guest/traveling flagged: ${profiles.filter((p) => p.guest_or_traveling).length}`)
  console.log(`Parse errors: ${profiles.filter((p) => p.parse_error).length}`)
  const unmapped: Record<string, number> = {}
  for (const p of profiles) for (const s of p.unmapped_styles) unmapped[s] = (unmapped[s] ?? 0) + 1
  console.log(`Unmapped style names: ${Object.entries(unmapped).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join(", ") || "none"}`)
}

function printExamples(profiles: Profile[]): void {
  const pick = [
    profiles.find((p) => p.is_studio === false && (p.instagram_followers ?? 0) > 200_000),
    profiles.find((p) => p.is_studio === false && (p.instagram_followers ?? Infinity) < 10_000),
    profiles.find((p) => p.is_studio === true),
    profiles.find((p) => !p.instagram_handle),
    profiles.find((p) => p.is_studio === false && p.studio_name),
  ]
  const seen = new Set<string>()
  const examples = pick.filter((p): p is Profile => !!p && !seen.has(p.url) && !!seen.add(p.url))
  for (const p of profiles) if (examples.length < 5 && !seen.has(p.url)) examples.push(p), seen.add(p.url)
  console.log("\n5 parsed examples:")
  for (const p of examples) console.log(JSON.stringify({ ...p, style_tags: p.style_tags.slice(0, 6) }, null, 1).replace(/\n\s*/g, " "), "\n")
}

// Test-run sample: 12 big artists (top of the listing), 12 small artists (bottom),
// 12 studios (spread through the studio listing), then random picks until at
// least 5 profiles without Instagram are in.
async function buildSample(rows: UrlRow[], limit: number, fetchOne: (r: UrlRow) => Promise<Profile | null>): Promise<UrlRow[]> {
  const saved = readJson<string[] | null>(SAMPLE_FILE, null)
  if (saved && saved.length === limit) {
    const byUrl = new Map(rows.map((r) => [r.url, r]))
    return saved.map((u) => byUrl.get(u)).filter((r): r is UrlRow => !!r)
  }
  const ranked = rows.filter((r) => r.listing_position !== null && !r.listed_as_studio).sort((a, b) => a.listing_position! - b.listing_position!)
  const studios = rows.filter((r) => r.listed_as_studio)
  const per = Math.max(1, Math.round(limit * 0.24))
  const chosen = new Map<string, UrlRow>()
  for (const r of ranked.slice(0, per)) chosen.set(r.url, r)
  for (const r of ranked.slice(-per)) chosen.set(r.url, r)
  for (let i = 0; i < per && studios.length; i++) {
    const r = studios[Math.floor((i * studios.length) / per)]
    chosen.set(r.url, r)
  }
  let noIg = 0
  for (const r of chosen.values()) if ((await fetchOne(r))?.instagram_handle === null) noIg++
  let probes = 0
  for (const r of seededShuffle(rows)) {
    if (chosen.size >= limit || probes >= 80) break
    if (chosen.has(r.url)) continue
    probes++
    const p = await fetchOne(r)
    const slotsLeft = limit - chosen.size
    if (p && !p.instagram_handle) {
      chosen.set(r.url, r)
      noIg++
    } else if (slotsLeft > Math.max(0, 5 - noIg)) chosen.set(r.url, r)
  }
  // If the site has (almost) no profiles without Instagram, fill the remaining slots anyway.
  for (const r of seededShuffle(rows)) {
    if (chosen.size >= limit) break
    if (!chosen.has(r.url)) {
      await fetchOne(r)
      chosen.set(r.url, r)
    }
  }
  const sample = Array.from(chosen.values()).slice(0, limit)
  writeJson(SAMPLE_FILE, sample.map((r) => r.url))
  console.log(`Sample: ${sample.length} profiles (${per} big, ${per} small, ${per} studios, rest random; ${noIg} without Instagram, ${probes} random probed)`)
  return sample
}

async function main() {
  const t0 = Date.now()
  const rows = readJsonl<UrlRow>(URLS_FILE)
  if (!rows.length) {
    console.error(`No URLs in ${URLS_FILE}. Run scripts/tw/discover.ts first.`)
    process.exit(1)
  }
  const cp = readJson<Checkpoint>(CHECKPOINT, { started_at: new Date().toISOString(), run_seconds: 0, fetched: 0, failed: {}, stopped: null })
  if (cp.stopped) console.log(`Resuming after a STOP (${cp.stopped}).`)
  cp.stopped = null
  const save = () => {
    cp.run_seconds += Math.round((Date.now() - t0) / 1000)
    writeJson(CHECKPOINT, cp)
  }

  const fetchOne = async (r: UrlRow): Promise<Profile | null> => {
    if (PARSE_ONLY) return parseCached(r.url)
    const res = await fetcher.get(r.url, { refresh: REFRESH })
    if (!res.ok) {
      cp.failed[r.url] = { status: res.status, error: res.error }
      return null
    }
    delete cp.failed[r.url]
    if (!res.cached) cp.fetched++
    return parseProfile(res.body, r.url, fetchedAt(r.url))
  }

  console.log(`fetch.ts — ${PARSE_ONLY ? "parse only (no network)" : `pacing ${fetcher.currentRps} req/s, max 3 in flight`}`)
  let targets = rows
  try {
    if (LIMIT) targets = await buildSample(rows, LIMIT, fetchOne)
    const todo = targets.filter((r) => PARSE_ONLY || REFRESH || readCache(r.url) === null)
    console.log(`${targets.length} profiles, ${targets.length - todo.length} already cached, ${todo.length} to fetch`)
    const progress = new Progress(todo.length, fetcher)
    let sinceSave = 0
    await runQueue(todo, 3, async (r) => {
      const p = await fetchOne(r)
      progress.tick(!!p)
      if (++sinceSave >= 100) {
        sinceSave = 0
        writeJson(CHECKPOINT, { ...cp, run_seconds: cp.run_seconds + Math.round((Date.now() - t0) / 1000) })
      }
    })
  } catch (e) {
    if (e instanceof StopError) {
      cp.stopped = e.message
      save()
      console.error(`\nSTOP: ${e.message}. Checkpoint saved to ${CHECKPOINT}; rerun to resume.`)
      process.exit(2)
    }
    throw e
  }
  save()

  // Parse everything from the cache (failed fetches become unparseable rows).
  const profiles: Profile[] = []
  for (const r of targets) {
    const p = parseCached(r.url)
    if (p) {
      if (r.listed_as_studio && p.is_studio === null) {
        p.is_studio = true
        p.methods.is_studio = "html"
      }
      profiles.push(p)
    } else {
      const f = cp.failed[r.url]
      profiles.push({ ...parseProfile("", r.url, ""), parse_error: `fetch failed: ${f ? f.error : "not fetched"}` })
    }
  }
  const out = LIMIT ? path.join(TW_DIR, "profiles.sample.jsonl") : PROFILES_FILE
  writeJsonl(out, profiles)
  writeJson(path.join(TW_DIR, LIMIT ? "fetch-stats.sample.json" : "fetch-stats.json"), {
    finished_at: new Date().toISOString(),
    profiles: targets.length,
    parsed: profiles.filter((p) => !p.parse_error).length,
    failed: Object.keys(cp.failed).length,
    failed_urls: cp.failed,
    run_seconds_total: cp.run_seconds,
    network_requests_this_run: fetcher.requests,
    errors_this_run: fetcher.errors,
    slowdowns_this_run: fetcher.slowdowns,
  })
  printReport(profiles.filter((p) => !p.parse_error?.startsWith("fetch failed")))
  if (LIMIT) printExamples(profiles.filter((p) => !p.parse_error))
  console.log(
    `\nWrote ${profiles.length} profiles → ${out}\n${Object.keys(cp.failed).length} failed fetches · ` +
      `${fetcher.requests} network requests this run · total fetch time ${fmtDuration(cp.run_seconds)}`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
