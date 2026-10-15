// scripts/tw/discover.ts — research only, no database access.
// Builds the list of US TattoosWizard profile URLs:
//   1. sitemap.xml → its sitemap index → the English artists sitemap(s)
//      (studios live under /artists/ too; language variants collapse to one URL)
//   2. /locations/united-states?page=1…N (the US listing) — tags which
//      profiles are US and adds any the sitemap missed
//   3. /locations/united-states?type=studio&page=1…N — tags studios
// Output: data/tw/urls.jsonl (US profiles only). STOPs if fewer than 5,000.
// Run: npx tsx scripts/tw/discover.ts [--refresh] [--rps 1]
//   Pages are cached in data/cache/tattooswizard/, so reruns don't refetch.

import zlib from "zlib"
import {
  SITE,
  TW_DIR,
  URLS_FILE,
  type UrlRow,
  canonicalProfileUrl,
  flag,
  numOption,
  usernameOf,
  writeJson,
  writeJsonl,
} from "./lib/common"
import { PoliteFetcher, Progress, StopError, fmtDuration, runQueue } from "./lib/fetcher"
import path from "path"

const MIN_US_TOTAL = 5000
const REFRESH = flag("--refresh")
const fetcher = new PoliteFetcher(Math.min(numOption("--rps") ?? 1, 1.5))

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
}

async function getText(url: string): Promise<string> {
  const res = await fetcher.get(url, { refresh: REFRESH })
  if (!res.ok) throw new Error(`${url}: ${res.error}`)
  return res.body
}

// .xml.gz sitemaps are sometimes served already decompressed.
async function getSitemap(url: string): Promise<string> {
  const body = await getText(url)
  if (body.charCodeAt(0) === 0x1f && body.charCodeAt(1) === 0x8b) {
    return zlib.gunzipSync(Buffer.from(body, "latin1")).toString("utf-8")
  }
  return body
}

function locs(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g), (m) => decodeEntities(m[1]))
}

interface ListingCard {
  url: string
  name: string | null
  place: string | null
  position: number
}

// One listing page: its profile cards (a.lc) and the highest page number linked.
function parseListing(html: string, page: number, pageSize: number): { cards: ListingCard[]; lastPage: number; total: number | null } {
  const cards: ListingCard[] = []
  const re = /<a[^>]*class="lc"[^>]*href="([^"]+)"/g
  const starts = Array.from(html.matchAll(re))
  starts.forEach((m, i) => {
    const url = canonicalProfileUrl(decodeEntities(m[1]))
    if (!url) return
    const chunk = html.slice(m.index!, starts[i + 1]?.index ?? m.index! + 6000)
    const name = chunk.match(/class="lc__name"[^>]*>([^<]*)</)?.[1]
    const place = chunk.match(/class="lc__place"[^>]*>([^<]*)</)?.[1]
    cards.push({
      url,
      name: name ? decodeEntities(name).trim() : null,
      place: place ? decodeEntities(place).trim() : null,
      position: (page - 1) * pageSize + i + 1,
    })
  })
  const pages = Array.from(html.matchAll(/[?&](?:amp;)?page=(\d+)/g), (m) => Number(m[1]))
  const total = html.match(/Showing\s+[\d,]+\s*[–-]\s*[\d,]+\s+of\s+([\d,]+)/)?.[1]
  return { cards, lastPage: Math.max(page, ...pages), total: total ? Number(total.replace(/,/g, "")) : null }
}

// Walks a listing from page 1 to its last page (page count read from page 1's pagination).
async function crawlListing(base: string, label: string): Promise<{ cards: ListingCard[]; pages: number; claimed: number | null; failedPages: number[] }> {
  const sep = base.includes("?") ? "&" : "?"
  const first = parseListing(await getText(`${base}${sep}page=1`), 1, 24)
  const pageSize = first.cards.length || 24
  const pages = Array.from({ length: Math.max(first.lastPage - 1, 0) }, (_, i) => i + 2)
  console.log(`${label}: ${first.total ?? "?"} profiles claimed, ${first.lastPage} pages`)
  const cards = [...first.cards]
  const failedPages: number[] = []
  const progress = new Progress(pages.length, fetcher)
  await runQueue(pages, 3, async (page) => {
    const res = await fetcher.get(`${base}${sep}page=${page}`, { refresh: REFRESH })
    if (res.ok) cards.push(...parseListing(res.body, page, pageSize).cards)
    else failedPages.push(page)
    progress.tick(res.ok)
  })
  return { cards, pages: first.lastPage, claimed: first.total, failedPages }
}

async function main() {
  const t0 = Date.now()
  console.log(`discover.ts — pacing ${fetcher.currentRps} req/s, max 3 in flight\n`)

  // 1. Sitemaps: keep only the English artist sitemaps (other languages list the same profiles).
  const index = await getSitemap(`${SITE}/sitemap.xml`)
  const children = locs(index)
  const artistMaps = children.filter((u) => /sitemap-artists(?:-en)?(?:-\d+)?\.xml(?:\.gz)?$/.test(u))
  const sitemapUrls = new Set<string>()
  if (children.length && /<sitemapindex/.test(index)) {
    for (const map of artistMaps) for (const u of locs(await getSitemap(map))) {
      const c = canonicalProfileUrl(u)
      if (c) sitemapUrls.add(c)
    }
  } else {
    for (const u of children) {
      const c = canonicalProfileUrl(u)
      if (c) sitemapUrls.add(c)
    }
  }
  console.log(`Sitemap: ${children.length} child sitemaps, ${artistMaps.length} English artist sitemap(s) → ${sitemapUrls.size} profiles (worldwide)\n`)

  // 2. US listing, 3. US studio listing
  const us = await crawlListing(`${SITE}/locations/united-states`, "US listing")
  const studios = await crawlListing(`${SITE}/locations/united-states?type=studio`, "US studio listing")
  const studioSet = new Set(studios.cards.map((c) => c.url))

  const byUrl = new Map<string, UrlRow>()
  for (const c of us.cards) {
    if (byUrl.has(c.url)) continue
    byUrl.set(c.url, {
      url: c.url,
      username: usernameOf(c.url),
      in_sitemap: sitemapUrls.has(c.url),
      in_us_listing: true,
      listed_as_studio: studioSet.has(c.url),
      listing_name: c.name,
      listing_place: c.place,
      listing_position: c.position,
    })
  }
  // A studio found only in the studio listing is still a US profile.
  for (const c of studios.cards) {
    if (byUrl.has(c.url)) continue
    byUrl.set(c.url, {
      url: c.url,
      username: usernameOf(c.url),
      in_sitemap: sitemapUrls.has(c.url),
      in_us_listing: true,
      listed_as_studio: true,
      listing_name: c.name,
      listing_place: c.place,
      listing_position: null,
    })
  }
  const rows = Array.from(byUrl.values()).sort((a, b) => (a.listing_position ?? 1e9) - (b.listing_position ?? 1e9))
  const overlap = rows.filter((r) => r.in_sitemap).length
  const listingOnly = rows.length - overlap

  const stats = {
    finished_at: new Date().toISOString(),
    run_seconds: Math.round((Date.now() - t0) / 1000),
    sitemap_profiles_worldwide: sitemapUrls.size,
    us_listing_claimed: us.claimed,
    us_listing_pages: us.pages,
    us_listing_cards: us.cards.length,
    us_listing_unique: new Set(us.cards.map((c) => c.url)).size,
    us_listing_failed_pages: us.failedPages,
    us_studio_listing_claimed: studios.claimed,
    us_studio_listing_unique: studioSet.size,
    us_studio_listing_failed_pages: studios.failedPages,
    overlap_sitemap_and_us_listing: overlap,
    us_only_in_listing: listingOnly,
    us_total: rows.length,
    network_requests: fetcher.requests,
    errors: fetcher.errors,
  }
  writeJson(path.join(TW_DIR, "discover-stats.json"), stats)

  console.log(`
Discovery
  Sitemap profiles (worldwide):    ${stats.sitemap_profiles_worldwide}
  US listing: ${us.claimed ?? "?"} claimed, ${stats.us_listing_cards} cards on ${us.pages} pages, ${stats.us_listing_unique} unique${us.failedPages.length ? `, FAILED pages: ${us.failedPages.join(",")}` : ""}
  US studio listing: ${studios.claimed ?? "?"} claimed, ${studioSet.size} unique${studios.failedPages.length ? `, FAILED pages: ${studios.failedPages.join(",")}` : ""}
  Overlap (US and in sitemap):     ${overlap}
  US profiles the sitemap missed:  ${listingOnly}
  Final US total:                  ${rows.length}
  Run time: ${fmtDuration(stats.run_seconds)}, ${fetcher.requests} network requests, ${fetcher.errors} errors`)

  if (rows.length < MIN_US_TOTAL) {
    console.error(
      `\nSTOP: only ${rows.length} US profiles (< ${MIN_US_TOTAL}). The listing claimed ${us.claimed ?? "?"}; ` +
        `${us.failedPages.length} listing pages failed. Not writing ${URLS_FILE}.`
    )
    process.exit(2)
  }
  writeJsonl(URLS_FILE, rows)
  console.log(`\nWrote ${rows.length} rows → ${URLS_FILE}`)
}

main().catch((e) => {
  if (e instanceof StopError) {
    console.error(`\nSTOP: ${e.message}. Rerun to resume — pages fetched so far are cached.`)
    process.exit(2)
  }
  console.error(e)
  process.exit(1)
})
