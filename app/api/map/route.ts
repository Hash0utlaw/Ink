import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getShopsNearMe } from "@/lib/supabase/shops"
import { getArtistsNearMe } from "@/lib/supabase/artists"
import { createClient } from "@/utils/supabase/server"
import type { MapboxLocation } from "@/lib/mapbox"
import type { Artist } from "@/types/artist"

export const dynamic = "force-dynamic"

// Nationwide fallback (no viewport known yet — first paint before the map's
// first moveend) is still flat-capped, top-rated-first.
const MAP_LIMIT = 500
// A bbox query is inherently scoped to what's on screen, so this is a
// backstop for an extremely zoomed-out view over a dense metro, not the
// primary limiting mechanism the way MAP_LIMIT is above.
const BBOX_LIMIT = 3000

interface Bounds {
  west: number
  south: number
  east: number
  north: number
}

function parseBbox(raw: string | null): Bounds | null {
  if (!raw) return null
  const parts = raw.split(",").map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null
  const [west, south, east, north] = parts
  return { west, south, east, north }
}

function shopToMapLocation(row: Record<string, unknown>, distanceMi?: number): MapboxLocation | null {
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

function artistToMapLocation(artist: Artist & { distance_mi?: number }): MapboxLocation | null {
  if (!artist.location.lat || !artist.location.lng) return null
  return {
    id: `artist-${artist.id}`,
    name: artist.name,
    type: "artist",
    coordinates: [artist.location.lng, artist.location.lat],
    address: [artist.location.city, artist.location.state].filter(Boolean).join(", "),
    rating: artist.rating,
    reviewCount: artist.reviewCount,
    image: artist.avatarUrl || undefined,
    isOpen: artist.isAvailable,
    specialties: artist.specialties,
    priceRange: artist.priceRange,
    distance: artist.distance_mi,
    description: artist.bio || undefined,
    website: artist.websiteUrl || undefined,
    instagram: artist.instagramHandle || undefined,
  }
}

// Raw-row mapper for the two directly-queried (non-RPC) artist paths below —
// both the unscoped nationwide fallback and the bbox path join straight
// against `shops` for coordinates rather than going through
// getArtistsNearMe/rowToArtist, so they share this instead of the
// Artist-shaped mapper above.
function artistRowToMapLocation(row: Record<string, unknown>): MapboxLocation | null {
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

const ARTIST_JOIN_COLUMNS =
  "id, display_name, city, state, rating, review_count, avatar_url, specialties, is_available, bio, instagram_handle, website_url, shops!inner(latitude, longitude, name)"

// Fetches shops that have valid coordinates directly from Supabase
async function getShopsWithCoords(rating: number, limit: number): Promise<Record<string, unknown>[]> {
  const supabase = createClient()
  let q = supabase
    .from("shops")
    .select("id, name, address, city, state, latitude, longitude, rating, review_count, logo_url, cover_image_url, accepts_walk_ins, hours, description")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .neq("latitude", 0)
    .neq("longitude", 0)

  if (rating > 0) q = q.gte("rating", rating)

  const { data, error } = await q.order("rating", { ascending: false }).limit(limit)
  if (error) console.error("[api/map] shops query error:", error.message)
  return (data ?? []) as Record<string, unknown>[]
}

async function getShopsInBounds(
  bounds: Bounds,
  rating: number,
  limit: number
): Promise<Record<string, unknown>[]> {
  const supabase = createClient()
  let q = supabase
    .from("shops")
    .select("id, name, address, city, state, latitude, longitude, rating, review_count, logo_url, cover_image_url, accepts_walk_ins, hours, description")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .neq("latitude", 0)
    .neq("longitude", 0)
    .gte("latitude", bounds.south)
    .lte("latitude", bounds.north)
    .gte("longitude", bounds.west)
    .lte("longitude", bounds.east)

  if (rating > 0) q = q.gte("rating", rating)

  const { data, error } = await q.order("rating", { ascending: false }).limit(limit)
  if (error) console.error("[api/map] shops bbox query error:", error.message)
  return (data ?? []) as Record<string, unknown>[]
}

async function getArtistsInBounds(
  bounds: Bounds,
  styles: string[],
  rating: number,
  limit: number
): Promise<Record<string, unknown>[]> {
  const supabase = createClient()
  let q = supabase
    .from("artists")
    .select(ARTIST_JOIN_COLUMNS)
    .not("shops.latitude", "is", null)
    .not("shops.longitude", "is", null)
    .neq("shops.latitude", 0)
    .neq("shops.longitude", 0)
    .gte("shops.latitude", bounds.south)
    .lte("shops.latitude", bounds.north)
    .gte("shops.longitude", bounds.west)
    .lte("shops.longitude", bounds.east)

  if (styles.length > 0) q = q.overlaps("specialties", styles)
  if (rating > 0) q = q.gte("rating", rating)

  const { data, error } = await q.order("rating", { ascending: false }).limit(limit)
  if (error) console.error("[api/map] artists bbox query error:", error.message)
  return (data ?? []) as Record<string, unknown>[]
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const latParam = searchParams.get("lat")
  const lngParam = searchParams.get("lng")
  const radius = Number(searchParams.get("radius") ?? "25")
  const type = searchParams.get("type") ?? "all"
  const stylesParam = searchParams.get("styles")
  const ratingParam = searchParams.get("rating")
  const bounds = parseBbox(searchParams.get("bbox"))

  const styles = stylesParam ? stylesParam.split(",").filter(Boolean) : []
  const rating = ratingParam ? Number(ratingParam) : 0

  const hasGeo = latParam && lngParam
  const lat = hasGeo ? Number(latParam) : 0
  const lng = hasGeo ? Number(lngParam) : 0

  const locations: MapboxLocation[] = []

  if (bounds) {
    // Viewport-driven query — the map's own moveend handler supplies this,
    // replacing the old flat MAP_LIMIT-for-everything behavior.
    if (type === "all" || type === "shops") {
      const rows = await getShopsInBounds(bounds, rating, BBOX_LIMIT)
      rows.forEach((row) => {
        const loc = shopToMapLocation(row)
        if (loc) locations.push(loc)
      })
    }
    if (type === "all" || type === "artists") {
      const rows = await getArtistsInBounds(bounds, styles, rating, BBOX_LIMIT)
      rows.forEach((row) => {
        const loc = artistRowToMapLocation(row)
        if (loc) locations.push(loc)
      })
    }
  } else if (hasGeo) {
    if (type === "all" || type === "shops") {
      const { data } = await getShopsNearMe(lat, lng, radius, { rating: rating || undefined })
      data.forEach((s) => {
        const loc = shopToMapLocation(s as unknown as Record<string, unknown>, s.distance_mi)
        if (loc) locations.push(loc)
      })
    }
    if (type === "all" || type === "artists") {
      const { data } = await getArtistsNearMe(lat, lng, radius, { rating: rating || undefined })
      data.forEach((a) => {
        const loc = artistToMapLocation(a)
        if (loc) locations.push(loc)
      })
    }
  } else {
    // No viewport and no geo — nationwide fallback for first paint, before
    // the map has told us what's actually visible.
    if (type === "all" || type === "shops") {
      const rows = await getShopsWithCoords(rating, MAP_LIMIT)
      rows.forEach((row) => {
        const loc = shopToMapLocation(row)
        if (loc) locations.push(loc)
      })
    }
    if (type === "all" || type === "artists") {
      const supabase = createClient()
      let aq = supabase
        .from("artists")
        .select(ARTIST_JOIN_COLUMNS)
        .not("shops.latitude", "is", null)
        .not("shops.longitude", "is", null)
        .neq("shops.latitude", 0)
        .neq("shops.longitude", 0)

      if (styles.length > 0) aq = aq.overlaps("specialties", styles)
      if (rating > 0) aq = aq.gte("rating", rating)

      const { data: aRows, error: aErr } = await aq.order("rating", { ascending: false }).limit(MAP_LIMIT)
      if (aErr) console.error("[api/map] artists query error:", aErr.message)
      ;(aRows ?? []).forEach((row: Record<string, unknown>) => {
        const loc = artistRowToMapLocation(row)
        if (loc) locations.push(loc)
      })
    }
  }

  return NextResponse.json({ data: locations, count: locations.length })
}
