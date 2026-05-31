import { createClient } from "@/utils/supabase/server"
import type { Artist, Review } from "@/types/artist"

export type ArtistFilters = {
  styles?: string[]
  price?: string[]
  rating?: number
  availableNow?: boolean
}

// Maps a raw Supabase row (snake_case columns) to the Artist shape the UI expects.
// Assumed table columns: id, name, shop_name, specialties (text[]),
// rating, review_count, location_address, location_city, location_lat, location_lng,
// avatar_url, portfolio_images (text[]), is_available, price_range,
// bio, reviews (jsonb), hours (jsonb)
export function rowToArtist(row: Record<string, unknown>): Artist {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    shopName: String(row.shop_name ?? ""),
    specialties: Array.isArray(row.specialties) ? (row.specialties as string[]) : [],
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    location: {
      address: String(row.location_address ?? ""),
      city: String(row.location_city ?? ""),
      lat: Number(row.location_lat ?? 0),
      lng: Number(row.location_lng ?? 0),
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

export async function getArtists(filters: ArtistFilters = {}): Promise<Artist[]> {
  try {
    const supabase = createClient()
    let query = supabase.from("artists").select("*")

    if (filters.styles && filters.styles.length > 0) {
      query = query.contains("specialties", filters.styles)
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

    const { data, error } = await query
    if (error || !data) return []
    return data.map((row) => rowToArtist(row as Record<string, unknown>))
  } catch {
    return []
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
    return data.map((row) => rowToArtist(row as Record<string, unknown>))
  } catch {
    return []
  }
}

// Looks up by the slug column (add a slug text column to the artists table).
export async function getArtistBySlug(slug: string): Promise<Artist | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("artists").select("*").eq("slug", slug).single()
    if (error || !data) return null
    return rowToArtist(data as Record<string, unknown>)
  } catch {
    return null
  }
}
