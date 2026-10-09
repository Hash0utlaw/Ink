import { createClient } from "@/utils/supabase/server"
import type { Artist, Review, AvailabilityStatus, PriceTier } from "@/types/artist"
import { sortStyleSlugs, toStyleSlugs } from "@/lib/styles"

export type ArtistFilters = {
  styles?: string[]
  price?: string[]
  rating?: number
  availableNow?: boolean
  query?: string
  city?: string
  /** Match city exactly (case-insensitive) instead of partially; the search page sets it when city and state are both given. */
  exactCity?: boolean
  state?: string
  zip?: string // artists have no ZIP column; matched on their shop's ZIP
  sortBy?: "rating" | "review_count" | "name"
  page?: number
  pageSize?: number
}

// Real artists table columns: id, user_id, shop_id, display_name, handle, bio,
// specialties (text[]), styles (text[] of lib/styles.ts slugs), city, state, hourly_rate, years_experience,
// instagram_handle, website_url, avatar_url, is_available, is_verified, is_active,
// rating, review_count, created_at, updated_at, is_claimed, source
/**
 * ILIKE pattern for a city filter. Partial by default ("charl" finds Charlotte);
 * exact, with LIKE wildcards escaped, so "Charlotte" never matches Port Charlotte.
 */
export function cityPattern(city: string, exact?: boolean): string {
  const c = city.trim()
  return exact ? c.replace(/[\\%_]/g, "\\$&") : `%${c}%`
}

export function rowToArtist(row: Record<string, unknown>): Artist {
  const shop = row.shops
    ? (Array.isArray(row.shops)
        ? (row.shops[0] as Record<string, unknown> | undefined)
        : (row.shops as Record<string, unknown>))
    : null

  return {
    id: String(row.id ?? ""),
    handle: String(row.handle ?? ""),
    name: String(row.display_name ?? ""),
    shopName: String(shop?.name ?? ""),
    specialties: Array.isArray(row.specialties) ? (row.specialties as string[]) : [],
    styles: Array.isArray(row.styles) ? sortStyleSlugs(row.styles as string[]) : [],
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    location: {
      address: String(shop?.address ?? ""),
      city: String(row.city ?? shop?.city ?? ""),
      state: String(row.state ?? shop?.state ?? ""),
      lat: Number(row.latitude ?? shop?.latitude ?? 0),
      lng: Number(row.longitude ?? shop?.longitude ?? 0),
    },
    avatarUrl: String(row.avatar_url ?? ""),
    portfolioImages: Array.isArray(row.portfolio_images) ? (row.portfolio_images as string[]) : [],
    previewImages: Array.isArray(row.preview_images) ? (row.preview_images as string[]) : [],
    isAvailable: Boolean(row.is_available ?? false),
    priceRange: (row.price_range as "low" | "medium" | "high") ?? "medium",
    priceTier: (row.price_tier as PriceTier) ?? "mid",
    availabilityStatus: (row.availability_status as AvailabilityStatus) ?? "available",
    avgResponseHours: row.avg_response_hours != null ? Number(row.avg_response_hours) : null,
    firstBookingDiscount: row.first_booking_discount != null ? Number(row.first_booking_discount) : null,
    bio: String(row.bio ?? ""),
    reviews: Array.isArray(row.reviews) ? (row.reviews as Review[]) : [],
    hours: ((shop?.hours ?? row.hours) as Record<string, string>) ?? {},
    instagramHandle: String(row.instagram_handle ?? ""),
    websiteUrl: String(row.website_url ?? ""),
    isClaimed: Boolean(row.is_claimed ?? false),
    hasAccount: row.user_id != null,
    isVerified: Boolean(row.is_verified ?? false),
  }
}

export async function getArtists(
  filters: ArtistFilters = {}
): Promise<{ data: Artist[]; count: number; error: string | null }> {
  try {
    const supabase = createClient()
    const zip = filters.zip?.trim()
    const columns: string = zip ? "*, shops!inner(zip)" : "*"
    let query = supabase
      .from("artists")
      .select(columns, { count: "exact", head: false })
      .eq("is_active", true)

    // Slugs, or old style names from URLs ("Fine Line") mapped to slugs.
    const styles = toStyleSlugs(filters.styles ?? [])
    if (styles.length > 0) {
      // overlaps (&&) matches artists who have ANY of the selected styles
      query = query.overlaps("styles", styles)
    }
    // TODO: Re-enable when claimed artists set their own price tier.
    // Every artist currently has the default price_tier "mid", so filters.price
    // is ignored and results come back unfiltered.
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
      query = query.ilike("city", cityPattern(filters.city, filters.exactCity))
    }
    if (filters.state) {
      query = query.eq("state", filters.state.toUpperCase())
    }
    if (zip) {
      query = query.eq("shops.zip", zip)
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
      data: ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => rowToArtist(row)),
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

    // search_artists_near returns artist columns + distance_mi + shops {name,
    // address, city, state} (nearest first, max 200) but no coordinates; the
    // map needs them, so fetch the shops' lat/lng in one batched query.
    const rows = (data ?? []) as Record<string, unknown>[]
    const shopIds = Array.from(new Set(rows.map((r) => r.shop_id).filter(Boolean).map(String)))
    const coords = new Map<string, { latitude: unknown; longitude: unknown }>()
    for (let i = 0; i < shopIds.length; i += 100) {
      const { data: shops, error: shopError } = await supabase
        .from("shops")
        .select("id, latitude, longitude")
        .in("id", shopIds.slice(i, i + 100))
      if (shopError) return { data: [], error: shopError.message }
      for (const s of shops ?? []) coords.set(String(s.id), s)
    }

    const artists = rows.map((r) => {
      const shop = coords.get(String(r.shop_id))
      return {
        ...rowToArtist({ ...r, latitude: shop?.latitude, longitude: shop?.longitude }),
        distance_mi: Number(r.distance_mi ?? 0),
      }
    })
    return { data: artists, error: null }
  } catch (e: unknown) {
    return { data: [], error: (e as Error).message }
  }
}

export async function getArtistById(id: string): Promise<Artist | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("artists")
      .select("*, shops(name, address, city, state, phone, hours, website)")
      .eq("id", id)
      .eq("is_active", true)
      .single()
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
    const { data, error } = await supabase.from("artists").select("*").in("id", ids).eq("is_active", true)
    if (error || !data) return []
    return data.map((row: Record<string, unknown>) => rowToArtist(row))
  } catch {
    return []
  }
}

export async function getArtistBySlug(slug: string): Promise<Artist | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("artists").select("*").eq("handle", slug).eq("is_active", true).single()
    if (error || !data) return null
    return rowToArtist(data as Record<string, unknown>)
  } catch {
    return null
  }
}

export async function getWorthTheDriveArtists(limit = 6): Promise<Artist[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("artists")
      .select("*")
      .eq("is_active", true)
      .gte("rating", 4.8)
      .gt("review_count", 0)
      .neq("availability_status", "not_taking_clients")
      .order("review_count", { ascending: false })
      .limit(limit)
    if (error || !data) return []
    return data.map((row: Record<string, unknown>) => rowToArtist(row))
  } catch {
    return []
  }
}
