import { createClient } from "@/utils/supabase/server"
import type { Artist, Review } from "@/types/artist"

export type ArtistFilters = {
  styles?: string[]
  price?: string[]
  rating?: number
  availableNow?: boolean
  query?: string
  city?: string
  state?: string
  zip?: string
  sortBy?: "rating" | "review_count" | "name"
  page?: number
  pageSize?: number
}

// Real artists table columns: id, user_id, shop_id, display_name, handle, bio,
// specialties (text[]), city, state, hourly_rate, years_experience,
// instagram_handle, website_url, is_available, is_verified, is_active,
// rating, review_count, created_at, updated_at, is_claimed, source
export function rowToArtist(row: Record<string, unknown>): Artist {
  return {
    id: String(row.id ?? ""),
    name: String(row.display_name ?? ""),
    shopName: "",
    specialties: Array.isArray(row.specialties) ? (row.specialties as string[]) : [],
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    location: {
      address: "",
      city: String(row.city ?? ""),
      lat: 0,
      lng: 0,
    },
    avatarUrl: String(row.avatar_url ?? ""),
    portfolioImages: Array.isArray(row.portfolio_images) ? (row.portfolio_images as string[]) : [],
    isAvailable: Boolean(row.is_available ?? false),
    priceRange: (row.price_range as "low" | "medium" | "high") ?? "medium",
    bio: String(row.bio ?? ""),
    reviews: Array.isArray(row.reviews) ? (row.reviews as Review[]) : [],
    hours: (row.hours as Record<string, string>) ?? {},
  }
}

export async function getArtists(
  filters: ArtistFilters = {}
): Promise<{ data: Artist[]; count: number; error: string | null }> {
  try {
    const supabase = createClient()
    let query = supabase.from("artists").select("*", { count: "exact", head: false })

    if (filters.styles && filters.styles.length > 0) {
      // overlaps (&&) matches artists who have ANY of the selected styles
      query = query.overlaps("specialties", filters.styles)
    }
    if (filters.price && filters.price.length > 0) {
      query = query.in("price_range", filters.price)
    }
    if (typeof filters.rating === "number" && filters.rating > 0) {
      query = query.gte("rating", filters.rating)
    }
    if (filters.availableNow) {
      query = query.eq("is_available", true)
    }
    if (filters.query) {
      query = query.ilike("display_name", `%${filters.query.trim()}%`)
    }
    if (filters.city) {
      query = query.ilike("city", `%${filters.city.trim()}%`)
    }
    if (filters.state) {
      query = query.eq("state", filters.state.toUpperCase())
    }
    if (filters.zip) {
      query = query.eq("zip", filters.zip.trim())
    }

    const sortCol = filters.sortBy ?? "display_name"
    const sortMap: Record<string, string> = { rating: "rating", review_count: "review_count", name: "display_name" }
    query = query.order(sortMap[sortCol] ?? "display_name", { ascending: sortCol !== "review_count" })

    // Always paginate — default page 0, 24 per page
    const page = filters.page ?? 0
    const size = filters.pageSize ?? 24
    query = query.range(page * size, (page + 1) * size - 1)

    const { data, count, error } = await query
    if (error) return { data: [], count: 0, error: error.message }
    return {
      data: (data ?? []).map((row: Record<string, unknown>) => rowToArtist(row)),
      count: count ?? 0,
      error: null,
    }
  } catch (e: unknown) {
    return { data: [], count: 0, error: (e as Error).message }
  }
}

export async function getArtistsNearMe(
  lat: number,
  lng: number,
  radiusMiles: number,
  filters: Pick<ArtistFilters, "rating" | "availableNow"> = {}
): Promise<{ data: (Artist & { distance_mi: number })[]; error: string | null }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.rpc("search_artists_near", {
      p_lat: lat,
      p_lng: lng,
      p_radius_mi: radiusMiles,
      p_min_rating: filters.rating ?? 0,
      p_available: filters.availableNow ?? null,
    })
    if (error) return { data: [], error: error.message }
    const artists = (data ?? []).map((row: Record<string, unknown>) => {
      const r = row as Record<string, unknown>
      return { ...rowToArtist(r), distance_mi: Number(r.distance_mi ?? 0) }
    })
    return { data: artists, error: null }
  } catch (e: unknown) {
    return { data: [], error: (e as Error).message }
  }
}

export async function getArtistById(id: string): Promise<Artist | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("artists").select("*").eq("id", id).single()
    if (error || !data) return null
    return rowToArtist(data as Record<string, unknown>)
  } catch {
    return null
  }
}

export async function getArtistsByIds(ids: string[]): Promise<Artist[]> {
  if (ids.length === 0) return []
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("artists").select("*").in("id", ids)
    if (error || !data) return []
    return data.map((row: Record<string, unknown>) => rowToArtist(row))
  } catch {
    return []
  }
}

export async function getArtistBySlug(slug: string): Promise<Artist | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("artists").select("*").eq("handle", slug).single()
    if (error || !data) return null
    return rowToArtist(data as Record<string, unknown>)
  } catch {
    return null
  }
}
