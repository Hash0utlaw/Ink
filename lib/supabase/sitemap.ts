import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { groupCitiesBySlug } from "@/lib/utils/states"

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

/** Listed shop and artist counts rounded down to the thousand ("26,000"), or null if they can't be read. */
export async function getRoundedListedCounts(): Promise<{ shops: string; artists: string } | null> {
  try {
    const [shops, artists] = await Promise.all([countListed("shops"), countListed("artists")])
    const floor = (n: number) => Math.floor(n / 1000) * 1000
    if (floor(shops) === 0 || floor(artists) === 0) return null
    return { shops: floor(shops).toLocaleString("en-US"), artists: floor(artists).toLocaleString("en-US") }
  } catch {
    return null
  }
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
 * One entry per city page: listed shops' cities grouped by state and URL slug
 * (cityToSlug — the same function the pages and links use), so spellings like
 * "St. Louis" and "St Louis" are one city.
 */
export async function getSitemapCities(): Promise<{ state: string; slug: string }[]> {
  const supabase = publicClient()
  const byState = new Map<string, string[]>()
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
      const list = byState.get(row.state) ?? []
      list.push(row.city)
      byState.set(row.state, list)
    }
    if (!data || data.length < PAGE) break
  }
  return Array.from(byState).flatMap(([state, cities]) => groupCitiesBySlug(cities).map(({ slug }) => ({ state, slug })))
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
