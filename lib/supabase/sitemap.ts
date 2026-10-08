import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { cityToSlug, citySlugToName } from "@/lib/utils/states"

// Sitemap data. Uses a cookie-free anon client (public rows only) so it also
// works outside a request, e.g. in generateSitemaps. PostgREST returns at most
// 1000 rows per request, so everything here pages with .range().

const PAGE = 1000

/** URLs per sitemap file; the protocol allows 50,000. */
export const SITEMAP_CHUNK = 40000

function publicClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("Supabase URL and anon key are required for the sitemap")
  return createClient(url, key, { auth: { persistSession: false } })
}

type Table = "shops" | "artists"

// Shops listed publicly: active and not flagged possibly closed (same as the city/state pages).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function listed(table: Table, q: any) {
  q = q.eq("is_active", true)
  return table === "shops" ? q.eq("possibly_closed", false) : q
}

export async function countListed(table: Table): Promise<number> {
  const { count, error } = await listed(table, publicClient().from(table).select("id", { count: "exact", head: true }))
  if (error) throw new Error(`count ${table}: ${error.message}`)
  return count ?? 0
}

/** Listed ids ordered by id, rows [offset, offset + limit). */
export async function getListedIds(table: Table, offset: number, limit: number): Promise<string[]> {
  const supabase = publicClient()
  const starts: number[] = []
  for (let from = offset; from < offset + limit; from += PAGE) starts.push(from)
  const ids: string[] = []
  // 10 pages in flight at a time, kept in order.
  for (let i = 0; i < starts.length; i += 10) {
    const pages = await Promise.all(
      starts.slice(i, i + 10).map(async (from) => {
        const to = Math.min(from + PAGE, offset + limit) - 1
        const { data, error } = await listed(table, supabase.from(table).select("id")).order("id").range(from, to)
        if (error) throw new Error(`${table} ids: ${error.message}`)
        return (data ?? []) as { id: string }[]
      }),
    )
    for (const rows of pages) ids.push(...rows.map((r) => r.id))
    if (pages[pages.length - 1].length < PAGE) break
  }
  return ids
}

/**
 * Distinct city/state pairs with listed shops, one per URL slug. Skips cities
 * whose slug doesn't map back to the stored name (e.g. "St. Louis"), because
 * the city page looks a city up from its slug and would 404 for them.
 */
export async function getSitemapCities(): Promise<{ city: string; state: string; slug: string }[]> {
  const supabase = publicClient()
  const seen = new Set<string>()
  const out: { city: string; state: string; slug: string }[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await listed("shops", supabase.from("shops").select("city, state"))
      .not("city", "is", null)
      .not("state", "is", null)
      .neq("city", "")
      .neq("state", "")
      .order("id")
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`cities: ${error.message}`)
    for (const row of (data ?? []) as { city: string; state: string }[]) {
      const slug = cityToSlug(row.city)
      const key = `${row.state}|${slug}`
      if (!slug || seen.has(key)) continue
      if (citySlugToName(slug).toLowerCase() !== row.city.trim().toLowerCase()) continue
      seen.add(key)
      out.push({ city: row.city, state: row.state, slug })
    }
    if (!data || data.length < PAGE) break
  }
  return out
}

export type SitemapPart = { id: number; kind: "pages" } | { id: number; kind: Table; offset: number }

/** Sitemap 0 is the static, style, state and city pages; then shop and artist chunks. */
export async function getSitemapParts(): Promise<SitemapPart[]> {
  const [shops, artists] = await Promise.all([countListed("shops"), countListed("artists")])
  const parts: SitemapPart[] = [{ id: 0, kind: "pages" }]
  for (const [kind, total] of [["shops", shops], ["artists", artists]] as const)
    for (let offset = 0; offset < Math.max(total, 1); offset += SITEMAP_CHUNK)
      parts.push({ id: parts.length, kind, offset })
  return parts
}
