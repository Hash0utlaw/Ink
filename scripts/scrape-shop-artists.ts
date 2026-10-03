// scrape-shop-artists.ts
// Fetches each shop's website, uses Claude Haiku to extract artist names,
// and inserts results into shop_artists. Then run promote-shop-artists.ts.
//
// Run: npx tsx scripts/scrape-shop-artists.ts [--apply] [--limit N] [--state XX]
//          [--max-cost=5] [--retry-failed]
//   Dry-run by default: fetches and extracts (this DOES spend API credit) but
//   writes nothing to the database. --apply inserts into shop_artists,
//   undo-logged as inserts (scripts/undo.ts deletes them).
//
// Candidates: active shops, not possibly_closed, with a real website (social,
// link-in-bio and booking platforms excluded), no shop_artists rows yet, and
// not already in the checkpoint.
//
// Checkpoint (data/scrape-artists-checkpoint.json): every attempted shop_id
// with its status — ok, no_artists, fetch_failed, robots_blocked, skipped — and
// the artists extracted. A recorded shop is never re-attempted; with
// --retry-failed, fetch_failed shops are. Artists extracted on a dry run are
// kept there, so a later --apply inserts them without fetching again.
//
// Politeness: robots.txt per origin (user-agent TattooMapsBot), 6 shops at a
// time, 8s timeout, at most 3 page fetches per shop: the homepage, the linked
// artists/team page, or — when no link is found — a guess at /artists,
// /our-artists, /team (first one that returns HTML).
//
// Quality: a name is kept only if it appears in the fetched page text; drops
// placeholders, names with digits/@/URLs, names over 4 words and duplicates.
// image_url must be http(s), resolved against the page, and not a
// logo/icon/favicon/sprite.
//
// Cost: input × $1/MTok + output × $5/MTok, logged per call. Stops cleanly at
// --max-cost (default $5) and immediately on a credit-balance or auth error.
//
// Outputs: data/scrape-artists-results.csv (one row per shop attempted this
// run) and data/scrape-artists-extracted.csv (one row per artist kept).

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import { randomUUID } from "crypto"
import Anthropic from "@anthropic-ai/sdk"
import { load as cheerioLoad } from "cheerio"
import robotsParser from "robots-parser"
import type { SupabaseClient } from "@supabase/supabase-js"
import { parseScriptArgs } from "./lib/args"
import { getSupabaseAdmin } from "./lib/supabase-admin"
import { UndoLog } from "./lib/undo-log"
import { fetchAll, modeBanner, runPool, writeCsv } from "./lib/cleanup-utils"
import { isPlaceholderName, normalizeArtistName } from "./lib/artist-names"

const ARGS = parseScriptArgs()
const MAX_COST = ARGS.maxCost ?? 5

const MODEL = "claude-haiku-4-5-20251001"
const INPUT_USD_PER_MTOK = 1
const OUTPUT_USD_PER_MTOK = 5

const USER_AGENT = "Mozilla/5.0 (compatible; TattooMapsBot/1.0; +https://tattoo-maps.com)"
const ROBOTS_UA = "TattooMapsBot"
const CONCURRENCY = 6
const TIMEOUT_MS = 8000
const MAX_FETCHES = 3
const GUESS_PATHS = ["/artists", "/our-artists", "/team"]
const MIN_TEXT_CHARS = 100

const CHECKPOINT = "data/scrape-artists-checkpoint.json"
const RESULTS_CSV = "data/scrape-artists-results.csv"
const EXTRACTED_CSV = "data/scrape-artists-extracted.csv"

// ── Types ────────────────────────────────────────────────────────────────────

type Shop = {
  id: string
  name: string
  city: string | null
  state: string | null
  website: string
}

type Status = "ok" | "no_artists" | "fetch_failed" | "robots_blocked" | "skipped"

type ExtractedArtist = {
  name: string
  specialty: string | null
  image_url: string | null
}

type CheckpointEntry = {
  status: Status
  at: string
  name: string
  website: string
  pages: string[]
  cost: number
  artists: ExtractedArtist[]
  // Set once the artists are in shop_artists (an --apply run).
  inserted: boolean
  note?: string
}

type Checkpoint = Record<string, CheckpointEntry>

// Stops the whole run: no credit left, or the key is rejected.
class FatalApiError extends Error {}

// ── Candidate filtering ──────────────────────────────────────────────────────

// Hosts that aren't the shop's own site (social, link-in-bio, booking, listings).
const EXCLUDED_HOST =
  /(^|\.)(facebook\.com|fb\.com|instagram\.com|tiktok\.com|youtube\.com|youtu\.be|twitter\.com|x\.com|linktr\.ee|business\.site|negocio\.site|booksy\.com|vagaro\.com|square\.site|squareup\.com|glossgenius\.com|schedulicity\.com|styleseat\.com|fresha\.com|setmore\.com|yelp\.com)$|(^|\.)google\.[a-z.]+$/i
// Spam domains seen in the data.
const SPAM_URL = /\.top\/|usacommetix/i

function normalizeUrl(website: string): URL | null {
  const raw = website.trim()
  if (!raw) return null
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    return url.protocol === "http:" || url.protocol === "https:" ? url : null
  } catch {
    return null
  }
}

function isRealWebsite(website: string | null): boolean {
  if (!website) return false
  const url = normalizeUrl(website)
  if (!url) return false
  return !EXCLUDED_HOST.test(url.hostname) && !SPAM_URL.test(website)
}

// ── Checkpoint ───────────────────────────────────────────────────────────────

function loadCheckpoint(): Checkpoint {
  if (!fs.existsSync(CHECKPOINT)) return {}
  return JSON.parse(fs.readFileSync(CHECKPOINT, "utf-8")) as Checkpoint
}

function saveCheckpoint(cp: Checkpoint): void {
  const tmp = `${CHECKPOINT}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(cp))
  fs.renameSync(tmp, CHECKPOINT)
}

// ── Fetching ─────────────────────────────────────────────────────────────────

type Page = { url: string; html: string }

async function fetchText(url: string, accept: string): Promise<{ text: string; finalUrl: string; contentType: string } | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: accept },
      redirect: "follow",
    })
    if (!resp.ok) return null
    const text = await resp.text()
    return { text, finalUrl: resp.url || url, contentType: resp.headers.get("content-type") ?? "" }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// One robots.txt per origin, fetched once. Missing/unreachable → allowed.
const robotsCache = new Map<string, Promise<ReturnType<typeof robotsParser> | null>>()

function robotsFor(url: URL): Promise<ReturnType<typeof robotsParser> | null> {
  const origin = url.origin
  if (!robotsCache.has(origin)) {
    const robotsUrl = `${origin}/robots.txt`
    robotsCache.set(
      origin,
      fetchText(robotsUrl, "text/plain").then((r) => (r && !/html/i.test(r.contentType) ? robotsParser(robotsUrl, r.text) : null))
    )
  }
  return robotsCache.get(origin)!
}

async function robotsAllows(url: string): Promise<boolean> {
  const robots = await robotsFor(new URL(url))
  return robots?.isDisallowed(url, ROBOTS_UA) !== true
}

async function fetchPage(url: string): Promise<Page | null> {
  const r = await fetchText(url, "text/html,application/xhtml+xml")
  if (!r || !/html/i.test(r.contentType)) return null
  return { url: r.finalUrl, html: r.text }
}

const ARTIST_PAGE_KEYWORDS = ["artist", "team", "crew", "staff", "tattooer", "meet-us", "meet-our"]

// Same-host link whose text or href looks like an artists/team page.
function findArtistPageUrl(page: Page): string | null {
  const $ = cheerioLoad(page.html)
  const base = new URL(page.url)
  let found: string | null = null
  $("a").each((_, el) => {
    if (found) return
    const href = ($(el).attr("href") ?? "").trim()
    if (!href || /^(mailto:|tel:|#|javascript:)/i.test(href)) return
    const text = $(el).text().toLowerCase()
    const hrefLower = href.toLowerCase()
    if (!ARTIST_PAGE_KEYWORDS.some((kw) => text.includes(kw) || hrefLower.includes(kw))) return
    try {
      const target = new URL(href, base)
      if (target.hostname !== base.hostname) return
      target.hash = ""
      if (target.toString() === base.toString()) return
      found = target.toString()
    } catch {
      // unparseable href
    }
  })
  return found
}

// ── Page content ─────────────────────────────────────────────────────────────

const BAD_IMAGE_PATH = /logo|icon|favicon|sprite/i

// Absolute http(s) image URL, or null if it's relative-unresolvable, data:,
// or a logo/icon/favicon/sprite.
function cleanImageUrl(src: string | null | undefined, pageUrl: string): string | null {
  const raw = (src ?? "").trim().split(/\s+/)[0]
  if (!raw || raw.startsWith("data:")) return null
  try {
    const url = new URL(raw, pageUrl)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    if (BAD_IMAGE_PATH.test(url.pathname)) return null
    return url.toString()
  } catch {
    return null
  }
}

// Everything a name could legitimately appear in: visible text plus image
// alt/title attributes, normalized the same way names are.
function pageHaystack(page: Page): string {
  const $ = cheerioLoad(page.html)
  $("script, style, noscript").remove()
  const attrs: string[] = []
  $("img[alt], [title], [aria-label]").each((_, el) => {
    for (const a of ["alt", "title", "aria-label"]) {
      const v = $(el).attr(a)
      if (v) attrs.push(v)
    }
  })
  return ` ${normalizeArtistName(`${$("body").text()} ${attrs.join(" ")}`)} `
}

// Text + candidate portrait images for the model, capped at 8000 chars.
function pageContent(page: Page): string {
  const $ = cheerioLoad(page.html)
  $("script, style, nav, footer, header, iframe, noscript, .nav, .footer, .header").remove()
  const imgs: string[] = []
  const seen = new Set<string>()
  $("img").each((_, el) => {
    const $el = $(el)
    const src = cleanImageUrl($el.attr("data-src") ?? $el.attr("data-lazy-src") ?? $el.attr("src") ?? $el.attr("srcset"), page.url)
    if (!src || seen.has(src)) return
    seen.add(src)
    const alt = ($el.attr("alt") ?? "").trim()
    imgs.push(`[img: ${src}${alt ? ` | alt: ${alt}` : ""}]`)
  })
  const text = $("body").text().replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
  return `${imgs.slice(0, 20).join("\n")}\n\n${text}`.slice(0, 8000)
}

// ── Extraction ───────────────────────────────────────────────────────────────

let anthropic: Anthropic
const usage = { calls: 0, input: 0, output: 0, cost: 0 }

function isFatal(e: unknown): boolean {
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return true
  if (e instanceof Anthropic.APIError && /credit balance|billing/i.test(e.message)) return true
  return false
}

async function extractArtists(content: string, shopName: string): Promise<{ artists: ExtractedArtist[]; cost: number }> {
  let msg: Anthropic.Message
  try {
    msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Extract tattoo artist information from this tattoo shop webpage.
Shop: ${shopName}

Page content:
${content}

Return a JSON array of artists. Each object:
{ "name": "Artist Name", "specialty": "style (optional)", "image_url": "from [img: ...] lines only if it's a portrait photo of that artist (optional)" }

Rules:
- Only real people who are tattoo artists at this shop, named exactly as written on the page
- Ignore shop services, prices, contact info, reviews, FAQ
- Return [] if no artists found
- JSON array only, no markdown fences, no extra text`,
        },
      ],
    })
  } catch (e) {
    if (isFatal(e)) throw new FatalApiError((e as Error).message)
    throw e
  }

  const input = msg.usage.input_tokens
  const output = msg.usage.output_tokens
  const cost = (input * INPUT_USD_PER_MTOK + output * OUTPUT_USD_PER_MTOK) / 1_000_000
  usage.calls++
  usage.input += input
  usage.output += output
  usage.cost += cost
  console.log(`    tokens in ${input} / out ${output} — $${cost.toFixed(4)} (running $${usage.cost.toFixed(4)})`)

  const block = msg.content[0]
  if (!block || block.type !== "text") return { artists: [], cost }
  try {
    const raw = block.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { artists: [], cost }
    const artists = parsed
      .filter((a) => typeof a?.name === "string")
      .map((a) => ({
        name: String(a.name).replace(/\s+/g, " ").trim(),
        specialty: typeof a.specialty === "string" && a.specialty.trim() ? a.specialty.trim() : null,
        image_url: typeof a.image_url === "string" ? a.image_url : null,
      }))
    return { artists, cost }
  } catch {
    return { artists: [], cost }
  }
}

// Why a name is dropped, or null to keep it.
function rejectName(name: string, haystack: string): string | null {
  if (isPlaceholderName(name)) return "placeholder"
  if (/\d/.test(name)) return "digits"
  if (/@|https?:|www\.|\.(com|net|org|co|ink)\b/i.test(name)) return "handle/url"
  if (name.split(/\s+/).length > 4) return "over 4 words"
  const norm = normalizeArtistName(name)
  if (!norm || !haystack.includes(` ${norm} `)) return "not on page"
  return null
}

// ── Per-shop work ────────────────────────────────────────────────────────────

let stopReason: string | null = null

function costLimitReached(): boolean {
  if (usage.cost >= MAX_COST && !stopReason) stopReason = `--max-cost $${MAX_COST} reached`
  return usage.cost >= MAX_COST
}

// Returns null when the shop wasn't attempted (stopped before the API call),
// so it stays out of the checkpoint.
async function processShop(shop: Shop): Promise<CheckpointEntry | null> {
  const entry = (status: Status, pages: string[], extra: Partial<CheckpointEntry> = {}): CheckpointEntry => ({
    status,
    at: new Date().toISOString(),
    name: shop.name,
    website: shop.website,
    pages,
    cost: 0,
    artists: [],
    inserted: false,
    ...extra,
  })

  const home = normalizeUrl(shop.website)
  if (!home) return entry("skipped", [], { note: "invalid url" })
  const homeUrl = home.toString()

  if (!(await robotsAllows(homeUrl))) return entry("robots_blocked", [homeUrl])

  let fetches = 0
  const tried: string[] = []
  const pages: Page[] = []
  const tryFetch = async (url: string): Promise<Page | null> => {
    if (fetches >= MAX_FETCHES) return null
    if (!(await robotsAllows(url))) return null
    fetches++
    tried.push(url)
    const page = await fetchPage(url)
    if (page) pages.push(page)
    return page
  }

  const homePage = await tryFetch(homeUrl)
  if (!homePage) return entry("fetch_failed", tried)
  if (EXCLUDED_HOST.test(new URL(homePage.url).hostname))
    return entry("skipped", tried, { note: `redirected to ${new URL(homePage.url).hostname}` })

  const linked = findArtistPageUrl(homePage)
  let artistPage: Page | null = linked ? await tryFetch(linked) : null
  if (!artistPage) {
    for (const path of GUESS_PATHS) {
      if (fetches >= MAX_FETCHES) break
      artistPage = await tryFetch(new URL(path, homePage.url).toString())
      if (artistPage) break
    }
  }

  const main = artistPage ?? homePage
  const content = pageContent(main)
  if (content.replace(/\[img: [^\]]*\]/g, "").trim().length < MIN_TEXT_CHARS)
    return entry("skipped", tried, { note: "too little page text" })

  if (stopReason || costLimitReached()) return null
  const { artists: raw, cost } = await extractArtists(content, shop.name)

  const haystack = pages.map(pageHaystack).join(" ")
  const kept: ExtractedArtist[] = []
  const seen = new Set<string>()
  const dropped: string[] = []
  for (const a of raw) {
    const why = rejectName(a.name, haystack)
    const norm = normalizeArtistName(a.name)
    if (why || seen.has(norm)) {
      dropped.push(`${a.name} (${why ?? "duplicate"})`)
      continue
    }
    seen.add(norm)
    kept.push({ name: a.name, specialty: a.specialty, image_url: cleanImageUrl(a.image_url, main.url) })
  }
  if (dropped.length) console.log(`    dropped: ${dropped.join(", ")}`)

  return entry(kept.length ? "ok" : "no_artists", tried, { cost, artists: kept })
}

// ── Inserting ────────────────────────────────────────────────────────────────

// Inserts the shop's artists whose normalized names aren't already present.
async function insertArtists(supabase: SupabaseClient, undo: UndoLog, shopId: string, artists: ExtractedArtist[]): Promise<number> {
  const { data, error } = await supabase.from("shop_artists").select("name").eq("shop_id", shopId)
  if (error) throw new Error(`read shop_artists for ${shopId} failed: ${error.message}`)
  const existing = new Set((data ?? []).map((r: { name: string | null }) => normalizeArtistName(r.name)))
  const rows = artists
    .filter((a) => !existing.has(normalizeArtistName(a.name)))
    .map((a) => ({ id: randomUUID(), shop_id: shopId, name: a.name, specialty: a.specialty, image_url: a.image_url }))
  if (rows.length === 0) return 0
  undo.append(rows.map((r) => ({ table: "shop_artists", id: r.id, field: "__row__", old_value: null, new_value: r, op: "insert" as const })))
  const { error: insertError } = await supabase.from("shop_artists").insert(rows)
  if (insertError) throw new Error(`insert shop_artists for ${shopId} failed: ${insertError.message}`)
  return rows.length
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  modeBanner(ARGS.apply)
  if (!ARGS.apply) console.log("WARNING: a dry run still fetches sites and calls the Claude API — it spends API credit.\n")
  console.log(`Max cost: $${MAX_COST}${ARGS.limit ? ` · limit ${ARGS.limit} shops` : ""}${ARGS.state ? ` · state ${ARGS.state}` : ""}${ARGS.retryFailed ? " · retrying fetch_failed" : ""}\n`)

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY in .env.local")
    process.exit(1)
  }
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const supabase = getSupabaseAdmin()
  const checkpoint = loadCheckpoint()
  const undo = new UndoLog("scrape-shop-artists")
  let inserted = 0

  // Artists extracted on an earlier dry run: insert them now, no refetch.
  if (ARGS.apply) {
    const pending = Object.entries(checkpoint).filter(([, e]) => e.status === "ok" && !e.inserted)
    if (pending.length) console.log(`Inserting artists saved from ${pending.length} earlier dry-run shops…`)
    for (const [shopId, e] of pending) {
      inserted += await insertArtists(supabase, undo, shopId, e.artists)
      e.inserted = true
    }
    if (pending.length) saveCheckpoint(checkpoint)
  }

  const shops = await fetchAll<Shop>(supabase, "shops", "id, name, city, state, website", (q) => {
    let query = q.eq("is_active", true).eq("possibly_closed", false).not("website", "is", null).neq("website", "")
    if (ARGS.state) query = query.eq("state", ARGS.state)
    return query
  })
  const seeded = new Set(
    (await fetchAll<{ id: string; shop_id: string }>(supabase, "shop_artists", "id, shop_id")).map((r) => r.shop_id)
  )
  const withSite = shops.filter((s) => isRealWebsite(s.website))
  const unseeded = withSite.filter((s) => !seeded.has(s.id))
  const candidates = unseeded.filter((s) => {
    const e = checkpoint[s.id]
    return !e || (ARGS.retryFailed && e.status === "fetch_failed")
  })
  const batch = ARGS.limit ? candidates.slice(0, ARGS.limit) : candidates

  console.log(`Active, not possibly_closed, with a website: ${shops.length}`)
  console.log(`  real website (platforms excluded):        ${withSite.length}`)
  console.log(`  …with no shop_artists rows:               ${unseeded.length}`)
  console.log(`  …not in checkpoint (candidates):          ${candidates.length}`)
  console.log(`Processing ${batch.length} shops.\n`)

  const results: Record<string, unknown>[] = []
  const extracted: Record<string, unknown>[] = []
  let sinceSave = 0
  let fatal: Error | null = null

  await runPool(batch, CONCURRENCY, async (shop) => {
    if (stopReason || fatal) return
    let e: CheckpointEntry | null
    try {
      e = await processShop(shop)
    } catch (err) {
      if (err instanceof FatalApiError) {
        fatal = err
        stopReason = `API error: ${err.message}`
        return
      }
      console.error(`  ${shop.name}: ${(err as Error).message} — not recorded, will be retried next run`)
      return
    }
    if (!e) return

    if (ARGS.apply && e.status === "ok") {
      try {
        inserted += await insertArtists(supabase, undo, shop.id, e.artists)
        e.inserted = true
      } catch (err) {
        fatal = err as Error
        stopReason = (err as Error).message
      }
    }
    checkpoint[shop.id] = e
    if (++sinceSave >= 10) {
      saveCheckpoint(checkpoint)
      sinceSave = 0
    }

    console.log(`  ${e.status.padEnd(14)} ${shop.name} (${shop.city ?? "?"}, ${shop.state ?? "?"}) — ${e.artists.length} artist(s)${e.note ? ` [${e.note}]` : ""}`)
    results.push({
      shop_id: shop.id,
      name: shop.name,
      website: shop.website,
      pages_fetched: e.pages.join(" "),
      status: e.status,
      artists_found: e.artists.length,
      cost: e.cost.toFixed(5),
    })
    for (const a of e.artists)
      extracted.push({ shop_id: shop.id, shop_name: shop.name, website: shop.website, artist_name: a.name, specialty: a.specialty, image_url: a.image_url })
  })

  saveCheckpoint(checkpoint)
  writeCsv(RESULTS_CSV, ["shop_id", "name", "website", "pages_fetched", "status", "artists_found", "cost"], results)
  writeCsv(EXTRACTED_CSV, ["shop_id", "shop_name", "website", "artist_name", "specialty", "image_url"], extracted)

  const byStatus: Record<string, number> = {}
  for (const r of results) byStatus[String(r.status)] = (byStatus[String(r.status)] ?? 0) + 1
  const withArtists = results.filter((r) => Number(r.artists_found) > 0)
  const remaining = candidates.length - results.length

  console.log(`\n══ Summary${ARGS.apply ? "" : " — DRY RUN"} ══`)
  if (stopReason) console.log(`Stopped early: ${stopReason}`)
  console.log(`Shops attempted: ${results.length}`)
  for (const [s, n] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) console.log(`  ${s.padEnd(15)} ${n}`)
  console.log(`Shops with ≥1 artist: ${withArtists.length}, artists: ${extracted.length}${withArtists.length ? ` (avg ${(extracted.length / withArtists.length).toFixed(2)})` : ""}`)
  console.log(`API calls: ${usage.calls}, tokens in ${usage.input} / out ${usage.output}`)
  console.log(`Cost: $${usage.cost.toFixed(4)}${results.length ? ` ($${(usage.cost / results.length).toFixed(5)} per shop attempted)` : ""}`)
  if (results.length) console.log(`Remaining candidates: ${remaining} → projected ~$${((usage.cost / results.length) * remaining).toFixed(2)}`)
  console.log(`Wrote ${RESULTS_CSV}, ${EXTRACTED_CSV}; checkpoint ${CHECKPOINT} (${Object.keys(checkpoint).length} shops)`)
  if (ARGS.apply) {
    console.log(`Inserted ${inserted} shop_artists rows.${undo.entries ? ` Undo log: ${undo.file}` : ""}`)
    if (inserted > 0) console.log("Next: npx tsx scripts/promote-shop-artists.ts (dry run), then --apply.")
  } else {
    console.log("Dry run — nothing written to the database. Pass --apply to insert (artists saved in the checkpoint are inserted without refetching).")
  }
  if (fatal) process.exit(1)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
