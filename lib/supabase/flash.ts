import { createClient } from "@/utils/supabase/server"

export interface FlashListing {
  id: string
  artistId: string
  artistName: string
  artistHandle: string
  artistAvatar: string
  title: string
  description: string | null
  imageUrl: string
  price: number
  priceMax: number | null
  style: string | null
  size: string | null
  city: string | null
  state: string | null
  isExclusive: boolean
  isAvailable: boolean
  createdAt: string
}

export interface FlashFilters {
  style?: string
  minPrice?: number
  maxPrice?: number
  state?: string
  city?: string
  page?: number
  pageSize?: number
}

function rowToFlash(row: Record<string, unknown>): FlashListing {
  const artist = row.artists
    ? (Array.isArray(row.artists) ? row.artists[0] : row.artists) as Record<string, unknown>
    : null

  return {
    id: String(row.id ?? ""),
    artistId: String(row.artist_id ?? ""),
    artistName: String(artist?.display_name ?? ""),
    artistHandle: String(artist?.handle ?? ""),
    artistAvatar: String(artist?.avatar_url ?? ""),
    title: String(row.title ?? ""),
    description: row.description != null ? String(row.description) : null,
    imageUrl: String(row.image_url ?? ""),
    price: Number(row.price ?? 0),
    priceMax: row.price_max != null ? Number(row.price_max) : null,
    style: row.style != null ? String(row.style) : null,
    size: row.size != null ? String(row.size) : null,
    city: row.city != null ? String(row.city) : null,
    state: row.state != null ? String(row.state) : null,
    isExclusive: Boolean(row.is_exclusive ?? false),
    isAvailable: Boolean(row.is_available ?? true),
    createdAt: String(row.created_at ?? ""),
  }
}

export async function getFlashListings(filters: FlashFilters = {}): Promise<{ data: FlashListing[]; count: number }> {
  try {
    const supabase = createClient()
    let query = supabase
      .from("flash_listings")
      .select("*, artists(display_name, handle, avatar_url)", { count: "exact" })
      .eq("is_available", true)

    if (filters.style) query = query.eq("style", filters.style)
    if (filters.state) query = query.eq("state", filters.state.toUpperCase())
    if (filters.city) query = query.ilike("city", `%${filters.city}%`)
    if (filters.minPrice != null) query = query.gte("price", filters.minPrice)
    if (filters.maxPrice != null) query = query.lte("price", filters.maxPrice)

    query = query.order("created_at", { ascending: false })

    const page = filters.page ?? 0
    const size = filters.pageSize ?? 24
    query = query.range(page * size, (page + 1) * size - 1)

    const { data, count, error } = await query
    if (error) return { data: [], count: 0 }
    return {
      data: (data ?? []).map((row: Record<string, unknown>) => rowToFlash(row)),
      count: count ?? 0,
    }
  } catch {
    return { data: [], count: 0 }
  }
}

export async function getFlashById(id: string): Promise<FlashListing | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("flash_listings")
      .select("*, artists(display_name, handle, avatar_url)")
      .eq("id", id)
      .single()
    if (error || !data) return null
    return rowToFlash(data as Record<string, unknown>)
  } catch {
    return null
  }
}

export async function getNewestFlash(limit = 6): Promise<FlashListing[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("flash_listings")
      .select("*, artists(display_name, handle, avatar_url)")
      .eq("is_available", true)
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error || !data) return []
    return data.map((row: Record<string, unknown>) => rowToFlash(row))
  } catch {
    return []
  }
}

export async function getArtistFlashListings(artistId: string): Promise<FlashListing[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("flash_listings")
      .select("*, artists(display_name, handle, avatar_url)")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false })
    if (error || !data) return []
    return data.map((row: Record<string, unknown>) => rowToFlash(row))
  } catch {
    return []
  }
}

export async function countArtistFlashListings(artistId: string): Promise<number> {
  try {
    const supabase = createClient()
    const { count } = await supabase
      .from("flash_listings")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", artistId)
    return count ?? 0
  } catch {
    return 0
  }
}
