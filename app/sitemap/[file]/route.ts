import { getListedIds, getSitemapCities, getSitemapParts, SITEMAP_CHUNK } from "@/lib/supabase/sitemap"
import { stateAbbrToSlug } from "@/lib/utils/states"
import { ALL_STYLES } from "@/app/styles/page"
import { SITE_URL } from "@/lib/site-config"

const BASE_URL = SITE_URL

// One part of the split sitemap, served at /sitemap/<id>.xml and listed by the
// index at /sitemap.xml (app/sitemap.xml/route.ts). Part 0 holds the static,
// style, state and city pages; the rest are shop and artist chunks.
// Plain route handlers rather than generateSitemaps: on Next 14 that clashes
// with an index route at /sitemap.xml in `next dev`.
export const revalidate = 86400

type Entry = { url: string; changeFrequency: string; priority: number }

function xml(entries: Entry[]): string {
  const lastmod = new Date().toISOString()
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries.map(
      (e) =>
        `<url><loc>${esc(e.url)}</loc><lastmod>${lastmod}</lastmod><changefreq>${e.changeFrequency}</changefreq><priority>${e.priority}</priority></url>`,
    ),
    `</urlset>`,
  ].join("\n")
}

async function pageEntries(): Promise<Entry[]> {
  const cities = await getSitemapCities()

  // Static pages
  const staticRoutes: Entry[] = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/artists`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/shops`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/flash`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/find-artist`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/tattoo-shops`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/map`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/styles`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/pricing`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/help`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
  ]

  // Style pages
  const styleRoutes: Entry[] = ALL_STYLES.map((style) => ({
    url: `${BASE_URL}/styles/${style.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }))

  // State pages — states with at least one listed shop (others 404)
  const stateRoutes: Entry[] = Array.from(new Set(cities.map((c) => c.state))).map((abbr) => ({
    url: `${BASE_URL}/tattoo-shops/${stateAbbrToSlug(abbr)}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }))

  // City pages
  const cityRoutes: Entry[] = cities.map(({ state, slug }) => ({
    url: `${BASE_URL}/tattoo-shops/${stateAbbrToSlug(state)}/${slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }))

  return [...staticRoutes, ...styleRoutes, ...stateRoutes, ...cityRoutes]
}

export async function GET(_req: Request, { params }: { params: { file: string } }) {
  const match = params.file.match(/^(\d+)\.xml$/)
  const part = match ? (await getSitemapParts()).find((p) => p.id === Number(match[1])) : undefined
  if (!part) return new Response("Not found", { status: 404 })

  const entries =
    part.kind === "pages"
      ? await pageEntries()
      : (await getListedIds(part.kind, part.offset, SITEMAP_CHUNK)).map((id) => ({
          url: `${BASE_URL}/${part.kind}/${id}`,
          changeFrequency: "monthly",
          priority: 0.6,
        }))
  return new Response(xml(entries), { headers: { "Content-Type": "application/xml" } })
}
