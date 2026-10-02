// lib/map-data.ts
// Server-side data access shared by the map API routes (/api/map,
// /api/map/pins, /api/map/details): paged Supabase queries and the row →
// MapboxLocation mappers the map components consume.

import { createClient } from "@/utils/supabase/server"
import type { MapboxLocation } from "@/lib/mapbox"

// Supabase/PostgREST returns at most 1,000 rows per request, so every map
// query is paged through fetchAllPages() below. These are the overall caps
// for both the viewport (bbox) and nationwide (no-bbox) paths.
export const SHOP_LIMIT = 30000
export const ARTIST_LIMIT = 15000
const PAGE_SIZE = 1000
const PAGE_CONCURRENCY = 6

export interface Bounds {
  west: number
  south: number
  east: number
  north: number
}

export function shopToMapLocation(row: Record<string, unknown>, distanceMi?: number): MapboxLocation | null {
  const lat = Number(row.latitude ?? 0)
  const lng = Number(row.longitude ?? 0)
  if (!lat || !lng) return null
  const hours = (row.hours as Record<string, string>) ?? {}
  return {
    id: `shop-${row.id}`,
    name: String(row.name ?? ""),
    type: "shop",
    coordinates: [lng, lat],
    address: [String(row.address ?? ""), String(row.city ?? "")].filter(Boolean).join(", "),
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    image: String(row.logo_url ?? row.cover_image_url ?? "") || undefined,
    isOpen: Boolean(row.accepts_walk_ins ?? false),
    specialties: Array.isArray(row.specialties) ? (row.specialties as string[]) : [],
    priceRange: "medium",
    distance: distanceMi,
    description: String(row.description ?? "") || undefined,
    hours: Object.keys(hours).length > 0 ? hours : undefined,
  }
}

// Raw-row mapper for the two directly-queried (non-RPC) artist paths below —
// both the unscoped nationwide fallback and the bbox path join straight
// against `shops` for coordinates rather than going through
// getArtistsNearMe/rowToArtist, so they share this instead of the
// Artist-shaped mapper above.
export function artistRowToMapLocation(row: Record<string, unknown>): MapboxLocation | null {
  const shopJoin = Array.isArray(row.shops) ? row.shops[0] : (row.shops as Record<string, unknown> | null)
  const lat = Number(shopJoin?.latitude ?? 0)
  const lng = Number(shopJoin?.longitude ?? 0)
  if (!lat || !lng) return null
  return {
    id: `artist-${row.id}`,
    name: String(row.display_name ?? ""),
    type: "artist",
    coordinates: [lng, lat],
    address: [String(row.city ?? ""), String(row.state ?? "")].filter(Boolean).join(", "),
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    image: String(row.avatar_url ?? "") || undefined,
    isOpen: Boolean(row.is_available ?? false),
    specialties: Array.isArray(row.specialties) ? (row.specialties as string[]) : [],
    priceRange: "medium",
    description: String(row.bio ?? "") || undefined,
    website: String(row.website_url ?? "") || undefined,
    instagram: String(row.instagram_handle ?? "") || undefined,
  }
}

// Only what the map pins, sidebar cards and LocationDetails read
// (description/hours/website are shown in LocationDetails).
export const ARTIST_JOIN_COLUMNS =
  "id, display_name, city, state, rating, review_count, avatar_url, specialties, is_available, bio, instagram_handle, website_url, shops!inner(latitude, longitude)"
export const SHOP_COLUMNS =
  "id, name, address, city, latitude, longitude, rating, review_count, logo_url, cover_image_url, accepts_walk_ins, hours, description"

// Builds a fully-filtered query for the given select; called once with
// head: true for the exact count and once per page.
export type QueryFactory = (columns: string, head?: boolean) => any // eslint-disable-line @typescript-eslint/no-explicit-any

// Exact count first, then pages of PAGE_SIZE via .range(), PAGE_CONCURRENCY
// at a time, up to maxRows. Ordered rating desc then id, so pages are stable.
export async function fetchAllPages(
  build: QueryFactory,
  columns: string,
  maxRows: number,
  label: string
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const { count, error: countError } = await build(columns, true)
  if (countError) {
    console.error(`[api/map] ${label} count error:`, countError.message)
    return { rows: [], total: 0 }
  }
  const total = count ?? 0
  const target = Math.min(total, maxRows)
  const pages = Math.ceil(target / PAGE_SIZE)
  const results: Record<string, unknown>[][] = new Array(pages)

  let next = 0
  const worker = async () => {
    while (next < pages) {
      const page = next++
      const from = page * PAGE_SIZE
      const to = Math.min(from + PAGE_SIZE, target) - 1
      const { data, error } = await build(columns)
        .order("rating", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to)
      if (error) console.error(`[api/map] ${label} page ${page} error:`, error.message)
      results[page] = (data ?? []) as Record<string, unknown>[]
    }
  }
  await Promise.all(Array.from({ length: Math.min(PAGE_CONCURRENCY, pages) }, worker))
  return { rows: results.flat(), total }
}

export function shopQuery(bounds: Bounds | null, rating: number): QueryFactory {
  const supabase = createClient()
  return (columns, head) => {
    let q = supabase
      .from("shops")
      .select(columns, head ? { count: "exact", head: true } : undefined)
      .eq("is_active", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .neq("latitude", 0)
      .neq("longitude", 0)
    if (bounds)
      q = q
        .gte("latitude", bounds.south)
        .lte("latitude", bounds.north)
        .gte("longitude", bounds.west)
        .lte("longitude", bounds.east)
    if (rating > 0) q = q.gte("rating", rating)
    return q
  }
}

export function artistQuery(bounds: Bounds | null, styles: string[], rating: number): QueryFactory {
  const supabase = createClient()
  return (columns, head) => {
    let q = supabase
      .from("artists")
      .select(columns, head ? { count: "exact", head: true } : undefined)
      .eq("is_active", true)
      .eq("shops.is_active", true)
      .not("shops.latitude", "is", null)
      .not("shops.longitude", "is", null)
      .neq("shops.latitude", 0)
      .neq("shops.longitude", 0)
    if (bounds)
      q = q
        .gte("shops.latitude", bounds.south)
        .lte("shops.latitude", bounds.north)
        .gte("shops.longitude", bounds.west)
        .lte("shops.longitude", bounds.east)
    if (styles.length > 0) q = q.overlaps("specialties", styles)
    if (rating > 0) q = q.gte("rating", rating)
    return q
  }
}
