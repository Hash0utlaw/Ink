// enrich-artists.ts
// Re-scrapes each shop's artist page with a richer prompt to populate
// bio, instagram_handle, website_url, and avatar_url for existing artists.
//
// Run: pnpm tsx scripts/enrich-artists.ts [--dry-run] [--limit N] [--state XX]

import { config } from "dotenv"
config({ path: ".env.local" })

import { createClient } from "@supabase/supabase-js"
import Anthropic from "@anthropic-ai/sdk"
import { load as cheerioLoad } from "cheerio"
import pLimit from "p-limit"

// ── CLI flags ────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes("--dry-run")

function getArg(flag: string): string | null {
  const eqIdx = argv.findIndex((a) => a.startsWith(`${flag}=`))
  if (eqIdx !== -1) return argv[eqIdx].split("=")[1]
  const spaceIdx = argv.indexOf(flag)
  if (spaceIdx !== -1 && argv[spaceIdx + 1]) return argv[spaceIdx + 1]
  return null
}

const LIMIT = getArg("--limit") ? parseInt(getArg("--limit")!) : null
const STATE = getArg("--state")?.toUpperCase() ?? null

if (DRY_RUN) console.log("DRY RUN — no data will be written.\n")
if (STATE) console.log(`Filtering to state: ${STATE}`)
if (LIMIT) console.log(`Processing at most ${LIMIT} shops`)

// ── Clients ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env vars in .env.local")
  process.exit(1)
}
if (!ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY.trim())
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

// ── Types ────────────────────────────────────────────────────────────────────

type ArtistRow = {
  id: string
  display_name: string
  shop_id: string
  state: string | null
  shops: { website: string | null } | { website: string | null }[] | null
}

type EnrichedArtist = {
  name: string
  bio?: string
  instagram?: string
  website?: string
  image_url?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ARTIST_PAGE_KEYWORDS = ["artist", "team", "crew", "staff", "tattooer", "meet-us", "meet-our"]

async function fetchHtml(url: string, timeoutMs = 6000): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TattooMapsBot/1.0; +https://inkfinder.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    })
    clearTimeout(timer)
    if (!resp.ok) return null
    const ct = resp.headers.get("content-type") ?? ""
    if (!ct.includes("html")) return null
    return await resp.text()
  } catch {
    return null
  }
}

function findArtistPageUrl(baseUrl: string, html: string): string | null {
  const $ = cheerioLoad(html)
  let found: string | null = null
  $("a").each((_, el) => {
    if (found) return
    const href = ($(el).attr("href") ?? "").trim()
    const text = $(el).text().toLowerCase()
    const hrefLower = href.toLowerCase()
    const skip =
      !href || href.startsWith("mailto:") || href.startsWith("tel:") ||
      href.startsWith("#") || href.startsWith("javascript:")
    if (skip) return
    if (ARTIST_PAGE_KEYWORDS.some((kw) => text.includes(kw) || hrefLower.includes(kw))) {
      found = href
    }
  })
  if (!found) return null
  try {
    const base = new URL(baseUrl)
    const target = new URL(found, baseUrl)
    if (target.hostname !== base.hostname) return null
    return target.toString()
  } catch {
    return null
  }
}

function extractPageContent(html: string): string {
  const $ = cheerioLoad(html)
  $("script, style, nav, footer, header, iframe, noscript").remove()
  const imgs: string[] = []
  $("img[src]").each((_, el) => {
    const src = $(el).attr("src") ?? ""
    if (src && !src.startsWith("data:") && src.length > 8) imgs.push(`[img: ${src}]`)
  })
  const text = $("body").text().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
  return (imgs.slice(0, 20).join("\n") + "\n\n" + text).slice(0, 10000)
}

function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function matchArtist(
  dbName: string,
  extracted: EnrichedArtist[]
): EnrichedArtist | null {
  const target = normalise(dbName)
  // Exact normalised match
  let match = extracted.find((e) => normalise(e.name) === target)
  if (match) return match
  // First-name match (e.g. DB has "Chris" but page has "Chris Torres")
  const firstName = target.split(/\s/)[0]
  if (firstName.length >= 3) {
    match = extracted.find((e) => normalise(e.name).startsWith(firstName))
    if (match) return match
  }
  return null
}

async function enrichShopArtists(
  website: string,
  shopName: string,
  artistNames: string[]
): Promise<EnrichedArtist[]> {
  const homeHtml = await fetchHtml(website)
  if (!homeHtml) return []

  let html = homeHtml
  const artistPageUrl = findArtistPageUrl(website, homeHtml)
  if (artistPageUrl) {
    const sub = await fetchHtml(artistPageUrl)
    if (sub) html = sub
  }

  const pageContent = extractPageContent(html)

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are extracting detailed profiles for tattoo artists from a shop website.
Shop: ${shopName}
Artists we are looking for: ${artistNames.join(", ")}

Page content:
${pageContent}

For each artist found, return a JSON array with objects containing:
{
  "name": "exact name as shown on page",
  "bio": "1-3 sentence artist bio or description of their style (from the page text, NOT invented)",
  "instagram": "Instagram handle like @username or full URL if found on page",
  "website": "personal website URL if different from shop site",
  "image_url": "URL from [img: ...] lines that looks like an artist portrait photo"
}

Rules:
- Only include artists whose names appear in the provided list (or close matches)
- Only use bio text that actually appears on the page — do NOT invent or fabricate bios
- If no bio text exists for an artist, omit the "bio" field entirely
- Instagram handles are often near artist names — look for @username patterns or instagram.com links
- Return [] if no matching artists found
- JSON array only, no markdown`,
      },
    ],
  })

  const block = msg.content[0]
  if (block.type !== "text") return []

  try {
    const raw = block.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((a): a is EnrichedArtist => typeof a?.name === "string" && a.name.trim().length > 0)
  } catch {
    return []
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Fetch artists that need enrichment, grouped by shop
  let query = supabase
    .from("artists")
    .select("id, display_name, shop_id, state, shops(website)")
    .is("bio", null)
    .eq("source", "shop_artists")
    .not("shop_id", "is", null)

  if (STATE) query = (query as typeof query).eq("state", STATE)

  // Paginate all matching artists
  const artists: ArtistRow[] = []
  const PAGE = 1000
  for (let page = 0; ; page++) {
    const { data, error } = await (query as typeof query).range(page * PAGE, (page + 1) * PAGE - 1)
    if (error) { console.error("Failed to fetch artists:", error.message); process.exit(1) }
    if (!data || data.length === 0) break
    artists.push(...(data as unknown as ArtistRow[]))
    if (data.length < PAGE) break
  }

  if (artists.length === 0) {
    console.log("No artists need enrichment.")
    process.exit(0)
  }

  // Group by shop_id
  const byShop = new Map<string, { website: string; artists: ArtistRow[] }>()
  for (const a of artists) {
    const shopData = Array.isArray(a.shops) ? a.shops[0] : a.shops
    const website = shopData?.website
    if (!website || website.includes("facebook.com") || website.includes("instagram.com")) continue
    if (!byShop.has(a.shop_id)) {
      byShop.set(a.shop_id, { website, artists: [] })
    }
    byShop.get(a.shop_id)!.artists.push(a)
  }

  let shopList = [...byShop.entries()]
  if (LIMIT) shopList = shopList.slice(0, LIMIT)

  console.log(`\nEnriching ${artists.length} artists across ${shopList.length} shops.\n`)

  const limit = pLimit(5)
  let updated = 0
  let noMatch = 0
  let failed = 0

  const tasks = shopList.map(([shopId, { website, artists: shopArtists }]) =>
    limit(async () => {
      const names = shopArtists.map((a) => a.display_name)
      let enriched: EnrichedArtist[]
      try {
        enriched = await enrichShopArtists(website, `shop ${shopId.slice(0, 8)}`, names)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes("credit balance")) {
          console.error("\nAnthropic API credits exhausted — stopping.")
          process.exit(1)
        }
        console.error(`  API error for shop ${shopId.slice(0, 8)}: ${msg}`)
        failed += shopArtists.length
        return
      }

      if (enriched.length === 0) { failed += shopArtists.length; return }

      for (const dbArtist of shopArtists) {
        const match = matchArtist(dbArtist.display_name, enriched)
        if (!match) { noMatch++; continue }

        // Normalise instagram handle
        let ig = match.instagram ?? null
        if (ig) {
          ig = ig.replace(/https?:\/\/(www\.)?instagram\.com\/?/i, "").replace(/^@/, "").split(/[/?]/)[0].trim()
          if (!ig) ig = null
        }

        const updates: Record<string, string | null> = {}
        if (match.bio && match.bio.trim().length > 10) updates.bio = match.bio.trim()
        if (ig) updates.instagram_handle = ig
        if (match.website) updates.website_url = match.website
        if (match.image_url) updates.avatar_url = match.image_url

        if (Object.keys(updates).length === 0) { noMatch++; continue }

        if (DRY_RUN) {
          console.log(`  [DRY RUN] ${dbArtist.display_name}: bio=${!!updates.bio} ig=${updates.instagram_handle ?? "—"} avatar=${!!updates.avatar_url}`)
          updated++
        } else {
          const { error } = await supabase
            .from("artists")
            .update(updates)
            .eq("id", dbArtist.id)
          if (error) {
            console.error(`  Update error for ${dbArtist.display_name}:`, error.message)
            failed++
          } else {
            updated++
          }
        }
      }

      await new Promise((r) => setTimeout(r, 150))
    })
  )

  await Promise.all(tasks)

  console.log("\n=== Summary ===")
  console.log(`  Artists needing enrichment : ${artists.length}`)
  console.log(`  Shops processed            : ${shopList.length}`)
  console.log(`  Artists updated            : ${DRY_RUN ? "(dry run)" : updated}`)
  console.log(`  No match found             : ${noMatch}`)
  console.log(`  Shop fetch failed          : ${failed}`)
  console.log(`\n${DRY_RUN ? "[DRY RUN]" : "✓"} Done.`)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
