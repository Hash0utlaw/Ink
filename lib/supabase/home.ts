import { unstable_cache } from "next/cache"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { STYLES, type StyleSlug, isStyleSlug } from "@/lib/styles"
import type { Shop } from "@/types/shop"
import { getShopArtists, getShops } from "./shops"

export interface StyleCount {
  slug: StyleSlug
  artists: number
}

// unstable_cache can't read cookies, so the cached query uses a plain anon client.
function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createSupabaseClient(url, key, { auth: { persistSession: false } })
}

async function fetchStyleCounts(): Promise<StyleCount[]> {
  const supabase = anonClient()
  if (!supabase) return []

  // style_counts() is added by supabase/migrations/20261008120000_style_counts.sql.
  const { data, error } = await supabase.rpc("style_counts")
  if (!error && Array.isArray(data)) {
    return (data as { style: string; artists: number | string }[])
      .filter((r) => isStyleSlug(r.style))
      .map((r) => ({ slug: r.style as StyleSlug, artists: Number(r.artists) }))
  }

  // Until that migration is applied: one head-only count per style (same
  // is_active + styles filter the artist search uses).
  const counts = await Promise.all(
    STYLES.map(async (s) => {
      const { count } = await supabase
        .from("artists")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .contains("styles", [s.slug])
      return { slug: s.slug, artists: count ?? 0 }
    })
  )
  return counts.filter((c) => c.artists > 0)
}

/** Active-artist counts per style, most first. Cached for 24 hours. */
export const getStyleCounts = unstable_cache(
  async (): Promise<StyleCount[]> => {
    try {
      return (await fetchStyleCounts()).sort((a, b) => b.artists - a.artists)
    } catch {
      return []
    }
  },
  ["home-style-counts"],
  { revalidate: 86400 }
)

/** Top-rated shops nationwide with at least `minReviews` reviews, plus how many artists each lists. */
export async function getTopRatedShops(
  limit = 4,
  minReviews = 50
): Promise<(Shop & { artistCount: number })[]> {
  const { data } = await getShops({ sortBy: "rating", minReviewCount: minReviews, page: 0, pageSize: limit })
  const shops = data.slice(0, limit)
  const artistLists = await Promise.all(shops.map((s) => getShopArtists(s.id)))
  return shops.map((s, i) => ({ ...s, artistCount: artistLists[i].length }))
}
