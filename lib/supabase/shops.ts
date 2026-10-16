import { createClient } from "@/utils/supabase/server"
import type { Shop } from "@/types/shop"
import type { Artist, Review } from "@/types/artist"
import { cityPattern, rowToArtist } from "./artists"
import { matchStyleSlugs, toStyleSlugs } from "@/lib/styles"
import { SHOP_STYLES_EMBED, fetchShopStyles, shopStylesFromRow } from "./shop-styles"
import { displayName } from "@/lib/display-name"

export type ShopFilters = {
  // Existing (keep these)
  styles?: string[]
  rating?: number
  acceptsWalkIns?: boolean

  // New
  zip?: string         // exact match: WHERE zip = $1
  state?: string       // exact: WHERE state = $1 (2-letter code)
  city?: string        // partial: WHERE city ILIKE '%$1%'
  exactCity?: boolean  // with city: WHERE city ILIKE '$1' (case-insensitive exact)
  query?: string       // name search: WHERE name ILIKE '%$1%'
  sortBy?: 'rating' | 'review_count' | 'name'
  minReviewCount?: number // WHERE review_count >= $1 (homepage top-rated list)
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
    name: displayName(String(row.name ?? "")),
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
      zip: String(row.zip ?? ""),
    },
    phone: String(row.phone ?? ""),
    website: String(row.website ?? ""),
    instagramUrl: String(row.instagram_url ?? ""),
    instagramFollowers: row.instagram_followers != null ? Number(row.instagram_followers) : null,
    tiktokUrl: String(row.tiktok_url ?? ""),
    facebookUrl: String(row.facebook_url ?? ""),
    youtubeUrl: String(row.youtube_url ?? ""),
    residentArtistIds: [],
    about: String(row.description ?? ""),
    reviews: Array.isArray(row.reviews) ? (row.reviews as Review[]) : [],
    hours: (row.hours as Record<string, string>) ?? {},
    styles: shopStylesFromRow(row),
    acceptsWalkIns: Boolean(row.accepts_walk_ins ?? false),
    isClaimed: Boolean(row.owner_user_id),
    possiblyClosed: Boolean(row.possibly_closed ?? false),
  }
}

export async function getShops(
  filters: ShopFilters = {}
): Promise<{ data: Shop[]; count: number; error: string | null }> {
  try {
    const supabase = createClient()
    // Every shop's styles come back embedded (shop_styles) for the cards. The
    // style filter is a second, aliased !inner embed: it drops shops with no
    // matching style without trimming the styles shown. Each shop comes back once.
    const styles = toStyleSlugs(filters.styles ?? [])
    let query = supabase
      .from("shops")
      .select(
        styles.length > 0 ? `*, ${SHOP_STYLES_EMBED}, style_match:shop_styles!inner(style)` : `*, ${SHOP_STYLES_EMBED}`,
        { count: "exact", head: false }
      )
      .eq("is_active", true)
      .eq("possibly_closed", false)

    if (styles.length > 0) {
      query = query.in("style_match.style", styles)
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
      query = query.ilike("city", cityPattern(filters.city, filters.exactCity))
    }
    if (filters.query) {
      query = query.ilike("name", `%${filters.query.trim()}%`)
    }
    if (typeof filters.minReviewCount === "number" && filters.minReviewCount > 0) {
      query = query.gte("review_count", filters.minReviewCount)
    }

    // Sorting
    const sortCol = filters.sortBy ?? "rating"
    const sortMap: Record<string, string> = { rating: "rating", review_count: "review_count", name: "name" }
    // Name and id break ties so pages don't overlap.
    query = query
      // Unrated shops (null) last, not first as Postgres puts them in descending order.
      .order(sortMap[sortCol], { ascending: sortCol === "name", nullsFirst: false })
      .order("name", { ascending: true })
      .order("id", { ascending: true })

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

    // The RPC doesn't return possibly_closed, so drop flagged shops here. The
    // flagged set is small (dozens), so fetching it beats an .in() over every
    // result id, which can overflow the URL at large radii.
    const rows = (data ?? []) as Record<string, unknown>[]
    const closed = new Set<string>()
    if (rows.length > 0) {
      const { data: flagged, error: flaggedError } = await supabase
        .from("shops")
        .select("id")
        .eq("is_active", true)
        .eq("possibly_closed", true)
      if (flaggedError) return { data: [], error: flaggedError.message }
      for (const r of flagged ?? []) closed.add(String(r.id))
    }

    // The RPC can't embed shop_styles; one batched lookup for all results.
    const open = rows.filter((row) => !closed.has(String(row.id)))
    const stylesById = await fetchShopStyles(supabase, open.map((row) => String(row.id)))
    const shops = open.map((row) => ({
      ...rowToShop(row),
      styles: stylesById.get(String(row.id)) ?? [],
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
    const { data, error } = await supabase.from("shops").select(`*, ${SHOP_STYLES_EMBED}`).eq("id", id).eq("is_active", true).single()
    if (error || !data) return null
    return rowToShop(data as Record<string, unknown>)
  } catch {
    return null
  }
}

export async function getShopsByIds(ids: string[]): Promise<Shop[]> {
  if (ids.length === 0) return []
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("shops").select(`*, ${SHOP_STYLES_EMBED}`).in("id", ids).eq("is_active", true)
    if (error || !data) return []
    return data.map((row: Record<string, unknown>) => rowToShop(row))
  } catch {
    return []
  }
}

// Looks up by the slug column (add a slug text column to the shops table).
export async function getShopBySlug(slug: string): Promise<Shop | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("shops").select(`*, ${SHOP_STYLES_EMBED}`).eq("slug", slug).eq("is_active", true).single()
    if (error || !data) return null
    return rowToShop(data as Record<string, unknown>)
  } catch {
    return null
  }
}

// Resident artists: active artists whose artists.shop_id is this shop. Only when
// there are none, falls back to stubs built from shop_artists rows
// (columns: id, shop_id, name, image_url, specialty, artist_profile_id). Stubs
// have no profile page, so they carry isStub and must not be linked.
export async function getShopArtists(shopId: string): Promise<Artist[]> {
  try {
    const supabase = createClient()

    const { data: artists, error: artistsError } = await supabase
      .from("artists")
      .select("*")
      .eq("shop_id", shopId)
      .eq("is_active", true)

    if (!artistsError && artists && artists.length > 0) {
      return artists.map((row: unknown) => rowToArtist(row as Record<string, unknown>))
    }

    // Fallback: return stub artists from shop_artists rows directly
    const { data: stubs, error: stubsError } = await supabase
      .from("shop_artists")
      .select("id, shop_id, name, image_url, specialty")
      .eq("shop_id", shopId)

    if (stubsError || !stubs) return []
    return stubs.map((row: Record<string, unknown>) => ({
      id: String(row.id ?? ""),
      handle: String(row.id ?? ""),
      name: displayName(String(row.name ?? "")),
      shopName: "",
      specialties: row.specialty ? [String(row.specialty)] : [],
      // Stub rows aren't in artists.styles yet; rules only (no AI) — see lib/styles.ts.
      styles: row.specialty ? matchStyleSlugs(String(row.specialty)) : [],
      rating: 0,
      reviewCount: 0,
      location: { address: "", city: "", state: "", lat: 0, lng: 0 },
      avatarUrl: String(row.image_url ?? ""),
      portfolioImages: [],
      previewImages: [],
      isAvailable: false,
      priceRange: "medium" as const,
      priceTier: "mid" as const,
      availabilityStatus: "not_taking_clients" as const,
      avgResponseHours: null,
      firstBookingDiscount: null,
      instagramFollowers: null,
      isClaimed: false,
      bio: "",
      reviews: [],
      hours: {},
      isStub: true,
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
