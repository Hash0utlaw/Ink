import { createClient } from "@/utils/supabase/server"
import type { Shop } from "@/types/shop"
import type { Artist, Review } from "@/types/artist"
import { rowToArtist } from "./artists"

export type ShopFilters = {
  // Existing (keep these)
  styles?: string[]
  rating?: number
  acceptsWalkIns?: boolean

  // New
  zip?: string         // exact match: WHERE zip = $1
  state?: string       // exact: WHERE state = $1 (2-letter code)
  city?: string        // partial: WHERE city ILIKE '%$1%'
  query?: string       // name search: WHERE name ILIKE '%$1%'
  sortBy?: 'rating' | 'review_count' | 'name'
  page?: number        // default 0
  pageSize?: number    // default 24
}

// Real shops table columns: id, name, slug, address, city, state, zip, phone,
// website, email, description, cover_image_url, logo_url, rating, review_count,
// latitude, longitude, place_id, google_maps_url, hours, accepts_walk_ins,
// is_verified, is_active, owner_user_id, created_at, updated_at
function rowToShop(row: Record<string, unknown>): Shop {
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
    reviews: Array.isArray(row.reviews) ? (row.reviews as Review[]) : [],
    hours: (row.hours as Record<string, string>) ?? {},
    specialties: Array.isArray(row.specialties) ? (row.specialties as string[]) : [],
    acceptsWalkIns: Boolean(row.accepts_walk_ins ?? false),
  }
}

export async function getShops(
  filters: ShopFilters = {}
): Promise<{ data: Shop[]; count: number; error: string | null }> {
  try {
    const supabase = createClient()
    let query = supabase.from("shops").select("*", { count: "exact", head: false })

    if (filters.styles && filters.styles.length > 0) {
      query = query.contains("specialties", filters.styles)
    }
    if (typeof filters.rating === "number" && filters.rating > 0) {
      query = query.gte("rating", filters.rating)
    }
    if (filters.acceptsWalkIns) {
      query = query.eq("accepts_walk_ins", true)
    }
    if (filters.zip) {
      query = query.eq("zip", filters.zip.trim())
    }
    if (filters.state) {
      query = query.eq("state", filters.state.toUpperCase())
    }
    if (filters.city) {
      query = query.ilike("city", `%${filters.city.trim()}%`)
    }
    if (filters.query) {
      query = query.ilike("name", `%${filters.query.trim()}%`)
    }

    // Sorting
    const sortCol = filters.sortBy ?? "rating"
    const sortMap: Record<string, string> = { rating: "rating", review_count: "review_count", name: "name" }
    query = query.order(sortMap[sortCol], { ascending: sortCol === "name" })

    // Pagination — only applied when the caller explicitly passes a page number
    if (filters.page !== undefined) {
      const page = filters.page
      const size = filters.pageSize ?? 24
      query = query.range(page * size, (page + 1) * size - 1)
    }

    const { data, count, error } = await query
    if (error) return { data: [], count: 0, error: error.message }
    return {
      data: (data ?? []).map((row: unknown) => rowToShop(row as Record<string, unknown>)),
      count: count ?? 0,
      error: null,
    }
  } catch (e: unknown) {
    return { data: [], count: 0, error: (e as Error).message }
  }
}

export async function getShopsNearMe(
  lat: number,
  lng: number,
  radiusMiles: number,
  filters: Pick<ShopFilters, "rating" | "acceptsWalkIns"> = {}
): Promise<{ data: (Shop & { distance_mi: number })[]; error: string | null }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.rpc("search_shops_near", {
      p_lat: lat,
      p_lng: lng,
      p_radius_mi: radiusMiles,
      p_min_rating: filters.rating ?? 0,
      p_walk_ins: filters.acceptsWalkIns ?? null,
    })
    if (error) return { data: [], error: error.message }
    const shops = (data ?? []).map((row: Record<string, unknown>) => ({
      ...rowToShop(row),
      distance_mi: Number(row.distance_mi ?? 0),
    }))
    return { data: shops, error: null }
  } catch (e: unknown) {
    return { data: [], error: (e as Error).message }
  }
}

export async function getShopById(id: string): Promise<Shop | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("shops").select("*").eq("id", id).single()
    if (error || !data) return null
    return rowToShop(data as Record<string, unknown>)
  } catch {
    return null
  }
}

// Looks up by the slug column (add a slug text column to the shops table).
export async function getShopBySlug(slug: string): Promise<Shop | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("shops").select("*").eq("slug", slug).single()
    if (error || !data) return null
    return rowToShop(data as Record<string, unknown>)
  } catch {
    return null
  }
}

// Looks up resident artists via the shop_artists join table.
// shop_artists columns: id, shop_id, name, image_url, specialty, artist_profile_id
export async function getShopArtists(shopId: string): Promise<Artist[]> {
  try {
    const supabase = createClient()

    // First try: artists linked via artist_profile_id → artists.id
    const { data: links, error: linksError } = await supabase
      .from("shop_artists")
      .select("artist_profile_id")
      .eq("shop_id", shopId)
      .not("artist_profile_id", "is", null)

    if (!linksError && links && links.length > 0) {
      const artistIds = (links as { artist_profile_id: string }[]).map((l) => l.artist_profile_id)
      const { data: artists, error: artistsError } = await supabase
        .from("artists")
        .select("*")
        .in("id", artistIds)

      if (!artistsError && artists && artists.length > 0) {
        return artists.map((row: unknown) => rowToArtist(row as Record<string, unknown>))
      }
    }

    // Fallback: return stub artists from shop_artists rows directly
    const { data: stubs, error: stubsError } = await supabase
      .from("shop_artists")
      .select("id, shop_id, name, image_url, specialty")
      .eq("shop_id", shopId)

    if (stubsError || !stubs) return []
    return stubs.map((row: Record<string, unknown>) => ({
      id: String(row.id ?? ""),
      name: String(row.name ?? ""),
      shopName: "",
      specialties: row.specialty ? [String(row.specialty)] : [],
      rating: 0,
      reviewCount: 0,
      location: { address: "", city: "", lat: 0, lng: 0 },
      avatarUrl: String(row.image_url ?? ""),
      portfolioImages: [],
      isAvailable: false,
      priceRange: "medium" as const,
      bio: "",
      reviews: [],
      hours: {},
    }))
  } catch {
    return []
  }
}

export async function getStates(): Promise<{ code: string; label: string; count: number }[]> {
  const STATE_NAMES: Record<string, string> = {
    CA: "California", TX: "Texas", FL: "Florida", NC: "North Carolina",
    LA: "Louisiana", NY: "New York", IL: "Illinois", AZ: "Arizona",
    CO: "Colorado", PA: "Pennsylvania", OR: "Oregon", NV: "Nevada",
    VA: "Virginia", NJ: "New Jersey", MO: "Missouri", WA: "Washington",
    MI: "Michigan", TN: "Tennessee", VT: "Vermont", MA: "Massachusetts",
    GA: "Georgia", UT: "Utah", SC: "South Carolina", WI: "Wisconsin",
    CT: "Connecticut", OH: "Ohio",
  }
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("shops")
      .select("state")
      .eq("is_active", true)
    if (!data) return []
    const counts: Record<string, number> = {}
    data.forEach((r: { state: string | null }) => {
      if (r.state) counts[r.state] = (counts[r.state] ?? 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({
        code,
        label: STATE_NAMES[code] ?? code,
        count,
      }))
  } catch {
    return []
  }
}
