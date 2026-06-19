import { createClient } from "@/utils/supabase/server"
import type { Shop } from "@/types/shop"
import { stateSlugToAbbr, citySlugToName } from "@/lib/utils/states"

// All distinct states with shop counts
export async function getStatesWithShopCounts(): Promise<{ state: string; count: number }[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.rpc
      ? await supabase
          .from("shops")
          .select("state")
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

// All distinct city/state pairs — used for sitemap generation
export async function getAllCityStatePairs(): Promise<{ city: string; state: string }[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("shops")
      .select("city, state")
      .not("city", "is", null)
      .not("state", "is", null)
      .neq("city", "")
      .neq("state", "")

    if (error || !data) return []

    const seen = new Set<string>()
    const pairs: { city: string; state: string }[] = []
    for (const row of data as { city: string; state: string }[]) {
      const key = `${row.city}|${row.state}`
      if (!seen.has(key)) {
        seen.add(key)
        pairs.push({ city: row.city, state: row.state })
      }
    }
    return pairs
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
      .select("*", { count: "exact" })
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
    specialties: Array.isArray(row.specialties) ? (row.specialties as string[]) : [],
    acceptsWalkIns: Boolean(row.accepts_walk_ins ?? false),
  }
}

// All shop IDs for sitemap
export async function getAllShopIds(): Promise<string[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("shops").select("id")
    if (error || !data) return []
    return (data as { id: string }[]).map((r) => r.id)
  } catch {
    return []
  }
}

// All artist IDs for sitemap (active only)
export async function getAllArtistIds(): Promise<string[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("artists")
      .select("id")
      .eq("is_active", true)
    if (error || !data) return []
    return (data as { id: string }[]).map((r) => r.id)
  } catch {
    return []
  }
}
