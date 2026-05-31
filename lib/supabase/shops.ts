import { createClient } from "@/utils/supabase/server"
import type { Shop } from "@/types/shop"
import type { Artist, Review } from "@/types/artist"
import { rowToArtist } from "./artists"

export type ShopFilters = {
  styles?: string[]
  rating?: number
  acceptsWalkIns?: boolean
}

// Assumed table columns: id, name, logo_url, cover_image_url, rating, review_count,
// location_address, location_city, location_lat, location_lng, resident_artist_ids (text[]),
// about, reviews (jsonb), hours (jsonb), specialties (text[]), accepts_walk_ins
function rowToShop(row: Record<string, unknown>): Shop {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    logoUrl: String(row.logo_url ?? ""),
    coverImageUrl: String(row.cover_image_url ?? ""),
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    location: {
      address: String(row.location_address ?? ""),
      city: String(row.location_city ?? ""),
      lat: Number(row.location_lat ?? 0),
      lng: Number(row.location_lng ?? 0),
    },
    residentArtistIds: Array.isArray(row.resident_artist_ids) ? (row.resident_artist_ids as string[]) : [],
    about: String(row.about ?? ""),
    reviews: Array.isArray(row.reviews) ? (row.reviews as Review[]) : [],
    hours: (row.hours as Record<string, string>) ?? {},
    specialties: Array.isArray(row.specialties) ? (row.specialties as string[]) : [],
    acceptsWalkIns: Boolean(row.accepts_walk_ins ?? false),
  }
}

export async function getShops(filters: ShopFilters = {}): Promise<Shop[]> {
  try {
    const supabase = createClient()
    let query = supabase.from("shops").select("*")

    if (filters.styles && filters.styles.length > 0) {
      query = query.contains("specialties", filters.styles)
    }
    if (typeof filters.rating === "number" && filters.rating > 0) {
      query = query.gte("rating", filters.rating)
    }
    if (filters.acceptsWalkIns) {
      query = query.eq("accepts_walk_ins", true)
    }

    const { data, error } = await query
    if (error || !data) return []
    return data.map((row) => rowToShop(row as Record<string, unknown>))
  } catch {
    return []
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

// Looks up resident artists via the shop_artists join table.
// Assumed table: shop_artists (shop_id, artist_id)
export async function getShopArtists(shopId: string): Promise<Artist[]> {
  try {
    const supabase = createClient()
    const { data: links, error: linksError } = await supabase
      .from("shop_artists")
      .select("artist_id")
      .eq("shop_id", shopId)

    if (linksError || !links || links.length === 0) return []

    const artistIds = (links as { artist_id: string }[]).map((l) => l.artist_id)
    const { data: artists, error: artistsError } = await supabase
      .from("artists")
      .select("*")
      .in("id", artistIds)

    if (artistsError || !artists) return []
    return artists.map((row) => rowToArtist(row as Record<string, unknown>))
  } catch {
    return []
  }
}
