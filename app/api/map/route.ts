import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getShopsNearMe } from "@/lib/supabase/shops"
import { getArtistsNearMe } from "@/lib/supabase/artists"
import type { MapboxLocation } from "@/lib/mapbox"
import type { Artist } from "@/types/artist"
import {
  ARTIST_JOIN_COLUMNS,
  ARTIST_LIMIT,
  SHOP_COLUMNS,
  SHOP_LIMIT,
  artistQuery,
  artistRowToMapLocation,
  fetchAllPages,
  shopQuery,
  shopToMapLocation,
  type Bounds,
} from "@/lib/map-data"

export const dynamic = "force-dynamic"

function parseBbox(raw: string | null): Bounds | null {
  if (!raw) return null
  const parts = raw.split(",").map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null
  const [west, south, east, north] = parts
  return { west, south, east, north }
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
  const totals = { shops: 0, artists: 0 }

  if (hasGeo && !bounds) {
    if (type === "all" || type === "shops") {
      const { data } = await getShopsNearMe(lat, lng, radius, { rating: rating || undefined })
      data.forEach((s) => {
        const loc = shopToMapLocation(s as unknown as Record<string, unknown>, s.distance_mi)
        if (loc) locations.push(loc)
      })
      totals.shops = data.length
    }
    if (type === "all" || type === "artists") {
      const { data } = await getArtistsNearMe(lat, lng, radius, { rating: rating || undefined })
      data.forEach((a) => {
        const loc = artistToMapLocation(a)
        if (loc) locations.push(loc)
      })
      totals.artists = data.length
    }
  } else {
    // Viewport (bbox) query from the map's moveend handler, or — with no
    // viewport yet — the nationwide first paint. Same paging and caps.
    const [shops, artists] = await Promise.all([
      type === "all" || type === "shops"
        ? fetchAllPages(shopQuery(bounds, rating), SHOP_COLUMNS, SHOP_LIMIT, "shops")
        : null,
      type === "all" || type === "artists"
        ? fetchAllPages(artistQuery(bounds, styles, rating), ARTIST_JOIN_COLUMNS, ARTIST_LIMIT, "artists")
        : null,
    ])
    shops?.rows.forEach((row) => {
      const loc = shopToMapLocation(row)
      if (loc) locations.push(loc)
    })
    artists?.rows.forEach((row) => {
      const loc = artistRowToMapLocation(row)
      if (loc) locations.push(loc)
    })
    totals.shops = shops?.total ?? 0
    totals.artists = artists?.total ?? 0
  }

  return NextResponse.json(
    { data: locations, count: locations.length, totals },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } }
  )
}
