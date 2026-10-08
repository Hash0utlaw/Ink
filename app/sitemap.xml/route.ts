import { getSitemapParts } from "@/lib/supabase/sitemap"
import { SITE_URL } from "@/lib/site-config"

// Sitemap index: lists the parts that app/sitemap/[file]/route.ts serves at
// /sitemap/<id>.xml (all URLs together exceed the 50,000-per-file limit).
export const revalidate = 86400

export async function GET() {
  const parts = await getSitemapParts()
  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...parts.map(({ id }) => `<sitemap><loc>${SITE_URL}/sitemap/${id}.xml</loc></sitemap>`),
    `</sitemapindex>`,
  ].join("\n")
  return new Response(body, { headers: { "Content-Type": "application/xml" } })
}
