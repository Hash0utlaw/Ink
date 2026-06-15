// scrape-shop-artists.ts
// Fetches each shop's website, uses Claude Haiku to extract artist names,
// and inserts results into shop_artists. Then run promote-shop-artists.ts.
//
// Run: pnpm tsx scripts/scrape-shop-artists.ts [--dry-run] [--limit N] [--state XX]

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
  console.error("Missing ANTHROPIC_API_KEY in .env.local — add it to proceed")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY.trim())
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

// ── Types ────────────────────────────────────────────────────────────────────

type Shop = {
  id: string
  name: string
  slug: string
  city: string | null
  state: string | null
  website: string
}

type ExtractedArtist = {
  name: string
  specialty?: string
  image_url?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SKIP_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "tiktok.com",
  ".top/",
  "usacommetix",
  "yelp.com",
  "google.com",
]

function shouldSkipUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return SKIP_DOMAINS.some((d) => lower.includes(d))
}

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

const ARTIST_PAGE_KEYWORDS = ["artist", "team", "crew", "staff", "tattooer", "meet-us", "meet-our"]

function findArtistPageUrl(baseUrl: string, html: string): string | null {
  const $ = cheerioLoad(html)
  let found: string | null = null

  $("a").each((_, el) => {
    if (found) return
    const href = ($(el).attr("href") ?? "").trim()
    const text = $(el).text().toLowerCase()
    const hrefLower = href.toLowerCase()

    const skip =
      !href ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("#") ||
      href.startsWith("javascript:")

    if (skip) return

    const matches = ARTIST_PAGE_KEYWORDS.some(
      (kw) => text.includes(kw) || hrefLower.includes(kw)
    )
    if (matches) found = href
  })

  if (!found) return null
  try {
    const resolved = new URL(found, baseUrl).toString()
    // Don't follow to a completely different domain
    const base = new URL(baseUrl)
    const target = new URL(resolved)
    if (target.hostname !== base.hostname) return null
    return resolved
  } catch {
    return null
  }
}

function extractPageContent(html: string): string {
  const $ = cheerioLoad(html)

  $("script, style, nav, footer, header, iframe, noscript, .nav, .footer, .header").remove()

  // Collect img srcs (possible artist photos)
  const imgs: string[] = []
  $("img[src]").each((_, el) => {
    const src = $(el).attr("src") ?? ""
    if (src && !src.startsWith("data:") && src.length > 8) {
      imgs.push(`[img: ${src}]`)
    }
  })

  const text = $("body").text().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
  const combined = imgs.slice(0, 20).join("\n") + "\n\n" + text
  return combined.slice(0, 8000)
}

async function extractArtists(
  pageContent: string,
  shopName: string
): Promise<ExtractedArtist[]> {
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Extract tattoo artist information from this tattoo shop webpage.
Shop: ${shopName}

Page content:
${pageContent}

Return a JSON array of artists. Each object:
{ "name": "Artist Name", "specialty": "style (optional)", "image_url": "from [img: ...] lines only if it's a portrait photo (optional)" }

Rules:
- Only real people who are tattoo artists at this shop
- Ignore shop services, prices, contact info, reviews, FAQ
- Return [] if no artists found
- JSON array only, no markdown fences, no extra text`,
      },
    ],
  })

  const block = msg.content[0]
  if (block.type !== "text") return []

  try {
    const raw = block.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (a): a is ExtractedArtist =>
        typeof a?.name === "string" && a.name.trim().length > 1
    )
  } catch {
    return []
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Fetch shops with scrapeable websites
  let query = supabase
    .from("shops")
    .select("id, name, slug, city, state, website")
    .eq("is_active", true)
    .not("website", "is", null)
    .not("website", "eq", "")
    .not("website", "ilike", "%facebook.com%")
    .not("website", "ilike", "%instagram.com%")
    .not("website", "ilike", "%.top/%")
    .not("website", "ilike", "%usacommetix%")

  if (STATE) query = (query as typeof query).eq("state", STATE)

  // Paginate through all matching shops (Supabase default cap is 1000/page)
  const shops: Shop[] = []
  if (LIMIT) {
    const { data, error } = await (query as typeof query).limit(LIMIT)
    if (error) { console.error("Failed to fetch shops:", error.message); process.exit(1) }
    shops.push(...((data ?? []) as Shop[]))
  } else {
    const PAGE = 1000
    for (let page = 0; ; page++) {
      const { data, error } = await (query as typeof query).range(page * PAGE, (page + 1) * PAGE - 1)
      if (error) { console.error("Failed to fetch shops:", error.message); process.exit(1) }
      if (!data || data.length === 0) break
      shops.push(...(data as Shop[]))
      if (data.length < PAGE) break
    }
  }

  if (shops.length === 0) {
    console.log("No shops matched the filters.")
    process.exit(0)
  }

  console.log(`\nFound ${shops.length} shops to process.\n`)

  // Paginate through all seeded shop_ids (re-run safety)
  const seeded = new Set<string>()
  for (let page = 0; ; page++) {
    const { data } = await supabase
      .from("shop_artists")
      .select("shop_id")
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (!data || data.length === 0) break
    data.forEach((r: { shop_id: string }) => seeded.add(r.shop_id))
    if (data.length < 1000) break
  }

  const limit = pLimit(10)
  let processed = 0
  let skipped = 0
  let alreadySeeded = 0
  let totalArtists = 0
  const byState: Record<string, number> = {}

  const tasks = (shops as Shop[]).map((shop) =>
    limit(async () => {
      // Skip if already seeded
      if (seeded.has(shop.id)) {
        alreadySeeded++
        return
      }

      if (shouldSkipUrl(shop.website)) {
        skipped++
        return
      }

      // Fetch homepage
      const homeHtml = await fetchHtml(shop.website)
      if (!homeHtml) {
        skipped++
        return
      }

      // Try to find a dedicated artists sub-page
      let html = homeHtml
      const artistPageUrl = findArtistPageUrl(shop.website, homeHtml)
      if (artistPageUrl) {
        const subHtml = await fetchHtml(artistPageUrl)
        if (subHtml) html = subHtml
      }

      const pageContent = extractPageContent(html)
      const artists = await extractArtists(pageContent, shop.name)

      processed++

      if (artists.length === 0) {
        skipped++
        return
      }

      const label = `${shop.name} (${shop.city ?? "?"}, ${shop.state ?? "?"})`
      console.log(`  ${label}: ${artists.length} artist(s)`)

      if (DRY_RUN) {
        console.log("    " + artists.map((a) => a.name).join(", "))
      } else {
        const rows = artists.map((a) => ({
          shop_id: shop.id,
          name: a.name.trim(),
          specialty: a.specialty?.trim() || null,
          image_url: a.image_url || null,
        }))

        const { error: insertErr } = await supabase.from("shop_artists").insert(rows)
        if (insertErr) {
          console.error(`    Insert error:`, insertErr.message)
          skipped++
          return
        }
      }

      totalArtists += artists.length
      const st = shop.state ?? "UNKNOWN"
      byState[st] = (byState[st] ?? 0) + artists.length

      // Polite delay
      await new Promise((r) => setTimeout(r, 150))
    })
  )

  await Promise.all(tasks)

  // Summary
  const stateLines = Object.entries(byState)
    .sort((a, b) => b[1] - a[1])
    .map(([st, cnt]) => `    ${st.padEnd(4)} ${cnt}`)
    .join("\n")

  console.log("\n=== Summary ===")
  console.log(`  Shops queried          : ${shops.length}`)
  console.log(`  Already seeded (skip)  : ${alreadySeeded}`)
  console.log(`  Processed              : ${processed}`)
  console.log(`  Failed/no artists      : ${skipped}`)
  console.log(`  Artists ${DRY_RUN ? "found (dry)" : "inserted"}     : ${totalArtists}`)
  if (stateLines) {
    console.log("\n  By state:")
    console.log(stateLines)
  }
  console.log(`\n${DRY_RUN ? "[DRY RUN]" : "✓"} Done.`)
  if (!DRY_RUN && totalArtists > 0) {
    console.log("\nNext: run promote-shop-artists.ts to promote these into the artists table.")
    console.log("  pnpm tsx scripts/promote-shop-artists.ts")
  }
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
