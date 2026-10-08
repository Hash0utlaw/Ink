import { createClient } from "@/utils/supabase/server"
import type { Shop } from "@/types/shop"
import { stateSlugToAbbr, citySlugToName } from "@/lib/utils/states"
import { SHOP_STYLES_EMBED, shopStylesFromRow } from "./shop-styles"

// All distinct states with shop counts
export async function getStatesWithShopCounts(): Promise<{ state: string; count: number }[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.rpc
      ? await supabase
          .from("shops")
          .select("state")
          .eq("is_active", true)
          .eq("possibly_closed", false)
          .not("state", "is", null)
          .neq("state", "")
      : { data: null, error: new Error("no rpc") }

    if (error || !data) return []

    const counts: Record<string, number> = {}
    for (const row of data as { state: string }[]) {
      if (row.state) counts[row.state] = (counts[row.state] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
  } catch {
    return []
  }
}

// Cities for a given state, with shop counts
export async function getCitiesForState(
  stateAbbr: string
): Promise<{ city: string; count: number }[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("shops")
      .select("city")
      .eq("is_active", true)
      .eq("possibly_closed", false)
      .eq("state", stateAbbr.toUpperCase())
      .not("city", "is", null)
      .neq("city", "")

    if (error || !data) return []

    const counts: Record<string, number> = {}
    for (const row of data as { city: string }[]) {
      if (row.city) counts[row.city] = (counts[row.city] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
  } catch {
    return []
  }
}

// Top N cities globally by shop count — used for generateStaticParams
export async function getTopCities(limit = 50): Promise<{ city: string; state: string; count: number }[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("shops")
      .select("city, state")
      .eq("is_active", true)
      .eq("possibly_closed", false)
      .not("city", "is", null)
      .not("state", "is", null)
      .neq("city", "")
      .neq("state", "")

    if (error || !data) return []

    const counts: Record<string, { city: string; state: string; count: number }> = {}
    for (const row of data as { city: string; state: string }[]) {
      const key = `${row.city}|${row.state}`
      if (!counts[key]) counts[key] = { city: row.city, state: row.state, count: 0 }
      counts[key].count++
    }
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  } catch {
    return []
  }
}

// Shops for a city page (paginated)
export async function getShopsForCity(
  citySlug: string,
  stateSlug: string,
  page = 0,
  pageSize = 24
): Promise<{ data: Shop[]; count: number; cityName: string; stateAbbr: string }> {
  const stateAbbr = stateSlugToAbbr(stateSlug)
  const cityName = citySlugToName(citySlug)

  if (!stateAbbr) return { data: [], count: 0, cityName, stateAbbr: "" }

  try {
    const supabase = createClient()
    const { data, count, error } = await supabase
      .from("shops")
      .select(`*, ${SHOP_STYLES_EMBED}`, { count: "exact" })
      .eq("is_active", true)
      .eq("possibly_closed", false)
      .ilike("city", cityName)
      .eq("state", stateAbbr)
      .order("rating", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error || !data) return { data: [], count: 0, cityName, stateAbbr }

    const shops = (data as Record<string, unknown>[]).map((row) => rowToShopMinimal(row))
    return { data: shops, count: count ?? 0, cityName, stateAbbr }
  } catch {
    return { data: [], count: 0, cityName, stateAbbr }
  }
}

function rowToShopMinimal(row: Record<string, unknown>): Shop {
  return {
    id: String(row.id ?? ""),
    slug: String(row.slug ?? ""),
    name: String(row.name ?? ""),
    logoUrl: String(row.logo_url ?? ""),
    coverImageUrl: String(row.cover_image_url ?? ""),
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    location: {
      address: String(row.address ?? ""),
      city: String(row.city ?? ""),
      state: String(row.state ?? ""),
      lat: Number(row.latitude ?? 0),
      lng: Number(row.longitude ?? 0),
    },
    phone: String(row.phone ?? ""),
    website: String(row.website ?? ""),
    residentArtistIds: [],
    about: String(row.description ?? ""),
    reviews: [],
    hours: (row.hours as Record<string, string>) ?? {},
    styles: shopStylesFromRow(row),
    acceptsWalkIns: Boolean(row.accepts_walk_ins ?? false),
  }
}

// Real platform-wide counts for the homepage hero stats
export async function getPlatformStats(): Promise<{
  shopCount: number
  artistCount: number
  cityCount: number
}> {
  try {
    const supabase = createClient()

    const [shopsRes, artistsRes, citiesRes] = await Promise.all([
      supabase.from("shops").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("artists").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase
        .from("shops")
        .select("city")
        .eq("is_active", true)
        .not("city", "is", null)
        .neq("city", ""),
    ])

    const shopCount = shopsRes.count ?? 0
    const artistCount = artistsRes.count ?? 0

    const cityValues = (citiesRes.data as { city: string }[] | null) ?? []
    const cityCount = new Set(cityValues.map((row) => row.city.trim().toLowerCase())).size

    return { shopCount, artistCount, cityCount }
  } catch {
    return { shopCount: 0, artistCount: 0, cityCount: 0 }
  }
}

// Escape LIKE wildcards so ilike is an exact, case-insensitive match.
function likeExact(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

// True when another listed shop has the same name, city and state — its page
// title then adds the street address so titles stay unique.
export async function shopHasNameTwin(shop: Pick<Shop, "id" | "name" | "location">): Promise<boolean> {
  try {
    const supabase = createClient()
    let q = supabase
      .from("shops")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("possibly_closed", false)
      .ilike("name", likeExact(shop.name))
      .neq("id", shop.id)
    q = shop.location.city ? q.ilike("city", likeExact(shop.location.city)) : q.or("city.is.null,city.eq.")
    q = shop.location.state ? q.eq("state", shop.location.state) : q.or("state.is.null,state.eq.")
    const { count } = await q
    return (count ?? 0) > 0
  } catch {
    return false
  }
}

// True when another active artist has the same name, city and state — the
// page title then adds the (unique) handle.
export async function artistHasNameTwin(artist: { id: string; name: string; city: string; state: string }): Promise<boolean> {
  try {
    const supabase = createClient()
    let q = supabase
      .from("artists")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .ilike("display_name", likeExact(artist.name))
      .neq("id", artist.id)
    q = artist.city ? q.ilike("city", likeExact(artist.city)) : q.or("city.is.null,city.eq.")
    q = artist.state ? q.eq("state", artist.state) : q.or("state.is.null,state.eq.")
    const { count } = await q
    return (count ?? 0) > 0
  } catch {
    return false
  }
}
