import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getShopsNearMe } from "@/lib/supabase/shops"
import { getArtistsNearMe } from "@/lib/supabase/artists"
import { createClient } from "@/utils/supabase/server"
import type { MapboxLocation } from "@/lib/mapbox"
import type { Artist } from "@/types/artist"

export const dynamic = "force-dynamic"

const MAP_LIMIT = 500

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

// Fetches shops that have valid coordinates directly from Supabase
async function getShopsWithCoords(
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

  if (rating > 0) q = q.gte("rating", rating)

  const { data, error } = await q.order("rating", { ascending: false }).limit(limit)
  if (error) console.error("[api/map] shops query error:", error.message)
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

  const styles = stylesParam ? stylesParam.split(",").filter(Boolean) : []
  const rating = ratingParam ? Number(ratingParam) : 0

  const hasGeo = latParam && lngParam
  const lat = hasGeo ? Number(latParam) : 0
  const lng = hasGeo ? Number(lngParam) : 0

  const locations: MapboxLocation[] = []

  if (hasGeo) {
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
    if (type === "all" || type === "shops") {
      const rows = await getShopsWithCoords(rating, MAP_LIMIT)
      rows.forEach((row) => {
        const loc = shopToMapLocation(row)
        if (loc) locations.push(loc)
      })
    }
    if (type === "all" || type === "artists") {
      // Artists don't have lat/lng — join with shops to get coordinates
      const supabase = createClient()
      let aq = supabase
        .from("artists")
        .select("id, display_name, city, state, rating, review_count, avatar_url, specialties, is_available, bio, instagram_handle, website_url, shops!inner(latitude, longitude, name)")
        .not("shops.latitude", "is", null)
        .not("shops.longitude", "is", null)
        .neq("shops.latitude", 0)
        .neq("shops.longitude", 0)

      if (styles.length > 0) aq = aq.overlaps("specialties", styles)
      if (rating > 0) aq = aq.gte("rating", rating)

      const { data: aRows, error: aErr } = await aq.order("rating", { ascending: false }).limit(MAP_LIMIT)
      if (aErr) console.error("[api/map] artists query error:", aErr.message)
      ;(aRows ?? []).forEach((row: Record<string, unknown>) => {
        const shopJoin = Array.isArray(row.shops) ? row.shops[0] : row.shops as Record<string, unknown> | null
        const lat = Number(shopJoin?.latitude ?? 0)
        const lng = Number(shopJoin?.longitude ?? 0)
        if (!lat || !lng) return
        const loc: MapboxLocation = {
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
        locations.push(loc)
      })
    }
  }

  return NextResponse.json({ data: locations, count: locations.length })
}
