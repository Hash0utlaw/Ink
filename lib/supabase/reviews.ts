import { createClient } from "@/utils/supabase/server"

export interface Review {
  id: string
  bookingRequestId: string | null
  artistId: string
  artistName: string
  artistHandle: string
  artistAvatar: string
  clientName: string
  rating: number
  reviewText: string | null
  createdAt: string
  isVerified: boolean
}

function rowToReview(row: Record<string, unknown>): Review {
  const artist = row.artists
    ? (Array.isArray(row.artists) ? row.artists[0] : row.artists) as Record<string, unknown>
    : null

  return {
    id: String(row.id ?? ""),
    bookingRequestId: row.booking_request_id != null ? String(row.booking_request_id) : null,
    artistId: String(row.artist_id ?? ""),
    artistName: String(artist?.display_name ?? ""),
    artistHandle: String(artist?.handle ?? ""),
    artistAvatar: String(artist?.avatar_url ?? ""),
    clientName: String(row.client_name ?? ""),
    rating: Number(row.rating ?? 5),
    reviewText: row.review_text != null ? String(row.review_text) : null,
    createdAt: String(row.created_at ?? ""),
    isVerified: Boolean(row.is_verified ?? true),
  }
}

export async function getRecentReviews(limit = 8): Promise<Review[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("reviews")
      .select("*, artists(display_name, handle, avatar_url)")
      .eq("is_verified", true)
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error || !data) return []
    return data.map((row: Record<string, unknown>) => rowToReview(row))
  } catch {
    return []
  }
}

export async function getReviewsForArtist(artistId: string): Promise<Review[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("reviews")
      .select("*, artists(display_name, handle, avatar_url)")
      .eq("artist_id", artistId)
      .eq("is_verified", true)
      .order("created_at", { ascending: false })
    if (error || !data) return []
    return data.map((row: Record<string, unknown>) => rowToReview(row))
  } catch {
    return []
  }
}

export async function getReviewByBookingId(bookingId: string): Promise<Review | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("reviews")
      .select("*, artists(display_name, handle, avatar_url)")
      .eq("booking_request_id", bookingId)
      .maybeSingle()
    if (error || !data) return null
    return rowToReview(data as Record<string, unknown>)
  } catch {
    return null
  }
}

export async function getBookingForReview(bookingId: string): Promise<{
  id: string
  artistId: string
  clientName: string
  status: string
  artistName: string
  artistHandle: string
} | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("booking_requests")
      .select("id, artist_id, client_name, status, artists(display_name, handle)")
      .eq("id", bookingId)
      .maybeSingle()
    if (error || !data) return null
    const row = data as Record<string, unknown>
    const artist = row.artists
      ? (Array.isArray(row.artists) ? row.artists[0] : row.artists) as Record<string, unknown>
      : null
    return {
      id: String(row.id ?? ""),
      artistId: String(row.artist_id ?? ""),
      clientName: String(row.client_name ?? ""),
      status: String(row.status ?? ""),
      artistName: String(artist?.display_name ?? ""),
      artistHandle: String(artist?.handle ?? ""),
    }
  } catch {
    return null
  }
}
