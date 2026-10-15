// scripts/socials/crawl.ts
// Fetches each shop's own website (Step 2, Part C) into data/cache/socials/.
// Fetches only; scripts/socials/extract.ts parses the cache.
//
// Scope: active shops whose website is their own site (see buildScope in
// lib/common.ts), one crawl per distinct site URL. Per site: robots.txt, the
// homepage, then up to 3 internal pages whose links look like artists, team,
// contact or about. robots.txt is respected (a Crawl-delay above 1s too).
//   - up to 16 sites in parallel, at most 1 request per second to any one host
//   - 10s timeout, up to 5 redirects, https first then http, 2 MB per page
//   - scripts, styles and SVGs are stripped before caching (JSON-LD is kept)
// Resumable: a site already in the cache is skipped (--refresh refetches).
//
// Run: npx tsx scripts/socials/crawl.ts [--sample 100] [--limit N] [--refresh] [--retry-errors]
//   --sample N crawls N random sites (seeded) for a test run.
//   --retry-errors refetches only sites whose homepage timed out or reset.

import { spawnSync } from "child_process"
// Node resolves DNS on libuv's 4-thread pool; with 16 sites in flight, slow
// lookups for dead domains starve the others into timeouts. Re-run with a
// bigger pool (it must be set before the process starts).
if (!process.env.UV_THREADPOOL_SIZE) {
  const r = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], { stdio: "inherit", env: { ...process.env, UV_THREADPOOL_SIZE: "64" } })
  process.exit(r.status ?? 1)
}

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import * as cheerio from "cheerio"
import robotsParser from "robots-parser"
import { getSupabaseAdmin } from "../lib/supabase-admin"
import { fetchAll, runPool } from "../lib/cleanup-utils"
import { withRetry } from "../lib/retry"
import { flag, numOption, writeJson } from "../tw/lib/common"
import {
  CACHE_DIR, SCOPE_FILE, USER_AGENT, bareHost, buildScope, readSite, websiteStatus, writeSite,
  type FetchOutcome, type Scope, type ScopeSite, type SiteRecord,
} from "./lib/common"

const CONCURRENCY = 16
const TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 5
const MAX_BYTES = 2 * 1024 * 1024
const MAX_EXTRA_PAGES = 3
const HOST_GAP_MS = 1000
const MAX_CRAWL_DELAY_MS = 10_000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---- per-host pacing ------------------------------------------------------------

const nextSlot = new Map<string, number>()
const hostGap = new Map<string, number>()
async function hostTurn(url: string): Promise<void> {
  const host = bareHost(url)
  const now = Date.now()
  const at = Math.max(now, nextSlot.get(host) ?? 0)
  nextSlot.set(host, at + (hostGap.get(host) ?? HOST_GAP_MS))
  if (at > now) await sleep(at - now)
}

// ---- fetching -------------------------------------------------------------------

function errorCode(e: unknown): string {
  const err = e as { name?: string; code?: string; cause?: { code?: string; name?: string; message?: string } }
  if (err?.name === "TimeoutError" || err?.name === "AbortError") return "TIMEOUT"
  return err?.cause?.code ?? err?.code ?? err?.cause?.name ?? (err as Error)?.message?.slice(0, 60) ?? "UNKNOWN"
}

async function readCapped(res: Response): Promise<{ text: string; truncated: boolean }> {
  if (!res.body) return { text: "", truncated: false }
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  let truncated = false
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.length
    if (size >= MAX_BYTES) {
      truncated = true
      await reader.cancel().catch(() => {})
      break
    }
  }
  return { text: Buffer.concat(chunks).subarray(0, MAX_BYTES).toString("utf-8"), truncated }
}

/** Strips what extract.ts never reads: scripts (but not JSON-LD), styles, SVG, comments. */
function slim(html: string): string {
  return html
    .replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "<svg></svg>")
    .replace(/<!--[\s\S]*?-->/g, "")
}

/** One URL, following redirects by hand (each hop paced per host). */
async function fetchUrl(url: string, wantBody: boolean): Promise<FetchOutcome> {
  let current = url
  for (let hop = 0; ; hop++) {
    await hostTurn(current)
    let res: Response
    try {
      res = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" },
      })
    } catch (e) {
      return { kind: "net", code: errorCode(e), url, final_url: current, redirects: hop }
    }
    const loc = res.headers.get("location")
    if (res.status >= 300 && res.status < 400 && loc) {
      await res.body?.cancel().catch(() => {})
      if (hop >= MAX_REDIRECTS) return { kind: "net", code: "TOO_MANY_REDIRECTS", url, final_url: current, redirects: hop }
      try {
        current = new URL(loc, current).toString()
      } catch {
        return { kind: "net", code: "BAD_REDIRECT", url, final_url: current, redirects: hop }
      }
      continue
    }
    if (res.status >= 400) {
      await res.body?.cancel().catch(() => {})
      return { kind: "http", status: res.status, url, final_url: current, redirects: hop }
    }
    const type = res.headers.get("content-type") ?? ""
    if (!wantBody || (type && !/html|xml|text\/plain/i.test(type))) {
      await res.body?.cancel().catch(() => {})
      return { kind: "ok", status: res.status, url, final_url: current, redirects: hop, content_type: type, html: null, truncated: false }
    }
    try {
      const { text, truncated } = await readCapped(res)
      return { kind: "ok", status: res.status, url, final_url: current, redirects: hop, content_type: type, html: text, truncated }
    } catch (e) {
      return { kind: "net", code: errorCode(e), url, final_url: current, redirects: hop }
    }
  }
}

// ---- one site -------------------------------------------------------------------

const EXTRA_LINK = [
  { reason: "artists", re: /\b(our[ -]?)?artists?\b|\bteam\b|\bstaff\b|\bcrew\b|\bmeet\b|\btattooers?\b|\bresidents?\b/i },
  { reason: "contact", re: /\bcontact\b/i },
  { reason: "about", re: /\babout\b/i },
]

/** Up to 3 internal links: artists/team first, then contact, then about. */
function extraLinks(html: string, base: string): { reason: string; url: string }[] {
  const $ = cheerio.load(html)
  const baseHost = bareHost(base)
  const found = new Map<string, { reason: string; url: string; rank: number }>()
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? ""
    let u: URL
    try {
      u = new URL(href, base)
    } catch {
      return
    }
    if (!/^https?:$/.test(u.protocol) || bareHost(u.toString()) !== baseHost) return
    if (/\.(pdf|jpe?g|png|gif|webp|zip|docx?|mp4)$/i.test(u.pathname)) return
    u.hash = ""
    const target = u.toString()
    if (target.replace(/\/$/, "") === base.replace(/#.*$/, "").replace(/\/$/, "")) return
    const label = `${decodeURIComponent(u.pathname).replace(/[-_/]/g, " ")} ${$(el).text().replace(/\s+/g, " ").slice(0, 60)}`
    EXTRA_LINK.forEach((x, rank) => {
      if (!x.re.test(label)) return
      const prev = found.get(target)
      if (!prev || rank < prev.rank) found.set(target, { reason: x.reason, url: target, rank })
    })
  })
  const list = Array.from(found.values()).sort((a, b) => a.rank - b.rank)
  // At most 2 of a kind, so contact or about still gets a slot.
  const out: typeof list = []
  for (const x of list) if (out.length < MAX_EXTRA_PAGES && out.filter((o) => o.reason === x.reason).length < 2) out.push(x)
  for (const x of list) if (out.length < MAX_EXTRA_PAGES && !out.includes(x)) out.push(x)
  return out.map(({ reason, url }) => ({ reason, url }))
}

// A whole site gets at most 2 minutes. A body read that never settles leaves
// no timer or socket behind, and Node would exit mid-run with code 0.
const SITE_TIMEOUT_MS = 120_000
function crawlSite(site: ScopeSite): Promise<SiteRecord> {
  let timer: NodeJS.Timeout | undefined
  const cap = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("SITE_TIMEOUT")), SITE_TIMEOUT_MS)
  })
  return Promise.race([crawlSiteInner(site), cap]).finally(() => clearTimeout(timer))
}

async function crawlSiteInner(site: ScopeSite): Promise<SiteRecord> {
  const rec: SiteRecord = { key: site.key, url: site.url, checked_at: new Date().toISOString(), robots: "none", home: null, pages: [], skipped_by_robots: 0 }
  const rest = site.url.trim().replace(/^https?:\/\//i, "")
  const host = rest.split(/[/?#]/)[0]

  // robots.txt, https then http. A network failure on both ends the site.
  let origin = `https://${host}`
  let robotsRes = await fetchUrl(`${origin}/robots.txt`, true)
  if (robotsRes.kind === "net" && robotsRes.redirects === 0) {
    const httpTry = await fetchUrl(`http://${host}/robots.txt`, true)
    if (httpTry.kind !== "net" || httpTry.redirects > 0) {
      origin = `http://${host}`
      robotsRes = httpTry
    } else {
      rec.home = { ...robotsRes, url: `https://${rest}`, final_url: `https://${rest}` }
      if (/ENOTFOUND|EAI_NONAME|ENODATA/.test(robotsRes.code) || /ENOTFOUND|EAI_NONAME|ENODATA/.test(httpTry.code)) return rec
      // Not a DNS failure: still try the homepage itself once.
    }
  }
  let robots: ReturnType<typeof robotsParser> | null = null
  if (robotsRes.kind === "ok" && robotsRes.html && !/<html/i.test(robotsRes.html.slice(0, 500))) {
    robots = robotsParser(robotsRes.final_url, robotsRes.html)
    rec.robots = "allowed"
    const delay = robots.getCrawlDelay("TattooMaps")
    if (delay && delay * 1000 > HOST_GAP_MS) hostGap.set(bareHost(origin), Math.min(delay * 1000, MAX_CRAWL_DELAY_MS))
  }
  const allowed = (u: string) => !robots || robots.isAllowed(u, "TattooMaps") !== false

  const homeUrl = `${origin}/${rest.slice(host.length).replace(/^\//, "")}`
  if (!allowed(homeUrl)) {
    rec.robots = "disallowed"
    rec.home = null
    return rec
  }
  let home = await fetchUrl(homeUrl, true)
  if (home.kind === "net" && home.redirects === 0 && origin.startsWith("https")) {
    const httpHome = await fetchUrl(`http://${rest}`, true)
    if (httpHome.kind !== "net" || httpHome.redirects > 0) home = httpHome
  }
  if (home.kind === "ok" && home.html) home = { ...home, html: slim(home.html) }
  rec.home = home

  const status = websiteStatus(rec).status
  if (home.kind !== "ok" || !home.html || status !== "ok") return rec
  for (const link of extraLinks(home.html, home.final_url)) {
    if (!allowed(link.url)) {
      rec.skipped_by_robots++
      continue
    }
    const page = await fetchUrl(link.url, true)
    rec.pages.push({ reason: link.reason, outcome: page.kind === "ok" && page.html ? { ...page, html: slim(page.html) } : page })
  }
  return rec
}

/** The cached homepage timed out or the connection reset: worth one more try. */
function isFlaky(key: string): boolean {
  const h = readSite(key)?.home
  return !!h && h.kind === "net" && /TIMEOUT|ECONNRESET|EAI_AGAIN|UND_ERR|EPIPE|ETIMEDOUT|CRAWLER/.test(h.code)
}

// ---- main -----------------------------------------------------------------------

function seededSample<T>(items: T[], k: number, seed = 42): T[] {
  const out = [...items]
  let s = seed
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2 ** 31
    const j = s % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.slice(0, k)
}

async function main() {
  const supabase = getSupabaseAdmin()
  const shops = await withRetry("fetch active shops", () =>
    fetchAll<{ id: string; name: string; city: string | null; state: string | null; website: string | null }>(
      supabase, "shops", "id, name, city, state, website", (q) => q.eq("is_active", true).not("website", "is", null),
    ),
  )
  const scope: Scope = buildScope(shops)
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  writeJson(SCOPE_FILE, scope)
  console.log(`Scope: ${scope.sites.length} sites for ${scope.sites.reduce((n, s) => n + s.shops.length, 0)} shops.`)
  for (const [k, v] of Object.entries(scope.excluded)) console.log(`  not crawled: ${k}: ${v}`)
  console.log(`  directory hosts: ${scope.directory_hosts.slice(0, 15).map((d) => `${d.host} (${d.shops})`).join(", ")}`)

  const sample = numOption("--sample")
  const limit = numOption("--limit")
  let sites = sample ? seededSample(scope.sites, sample) : scope.sites
  if (limit) sites = sites.slice(0, limit)
  const refresh = flag("--refresh")
  const todo = flag("--retry-errors") ? sites.filter((s) => isFlaky(s.key)) : refresh ? sites : sites.filter((s) => !readSite(s.key))
  console.log(`Crawling ${todo.length} of ${sites.length} sites (${sites.length - todo.length} already cached), ${CONCURRENCY} at a time.`)

  const counts: Record<string, number> = {}
  let done = 0
  const started = Date.now()
  const progress = () => {
    const mins = (Date.now() - started) / 60000
    console.log(`  ${done} / ${todo.length} sites, ${mins.toFixed(1)} min, ${(done / Math.max(mins, 0.01)).toFixed(0)}/min — ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ")}`)
  }
  await runPool(todo, CONCURRENCY, async (site) => {
    let rec: SiteRecord
    try {
      rec = await crawlSite(site)
    } catch (e) {
      rec = { key: site.key, url: site.url, checked_at: new Date().toISOString(), robots: "none", home: { kind: "net", code: (e as Error).message === "SITE_TIMEOUT" ? "TIMEOUT" : `CRAWLER:${(e as Error).message.slice(0, 80)}`, url: site.url, final_url: site.url, redirects: 0 }, pages: [], skipped_by_robots: 0 }
    }
    writeSite(rec)
    const st = websiteStatus(rec).status
    counts[st] = (counts[st] ?? 0) + 1
    done++
    if (done % 500 === 0) progress()
  })
  progress()

  // One more try, after the main pass, for sites that timed out or reset.
  const flaky = todo.filter((s) => isFlaky(s.key))
  if (flaky.length) {
    console.log(`Retrying ${flaky.length} sites that timed out or reset.`)
    let fixed = 0
    await runPool(flaky, CONCURRENCY, async (site) => {
      try {
        const rec = await crawlSite(site)
        if (websiteStatus(rec).status !== "error" || rec.home?.kind !== "net") fixed++
        writeSite(rec)
      } catch {
        // keep the first record
      }
    })
    console.log(`  ${fixed} of ${flaky.length} reached on retry.`)
  }
  console.log("Done. Next: npx tsx scripts/socials/extract.ts")
}

main().catch((e) => {
  console.error("Fatal:", e)
  process.exit(1)
})
