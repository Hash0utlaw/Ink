import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { ARTIST_LIMIT, SHOP_LIMIT, artistQuery, fetchAllPages, shopQuery } from "@/lib/map-data"

export const dynamic = "force-dynamic"

// Every map-eligible shop and artist as compact tuples, loaded once by the
// map; full details come from /api/map/details for what's actually shown.
//   shops:   [id, lat, lng, rating]
//   artists: [id, lat, lng, rating, primarySpecialty?] — the 5th element only
//            drives the pin color (see mapbox-map.tsx getStyleColor) and is
//            omitted when the artist has no specialties.
// ids are raw UUIDs; the client adds the "shop-"/"artist-" prefixes.

const round = (n: unknown, places: number) => {
  const f = 10 ** places
  return Math.round(Number(n) * f) / f
}

export async function GET(request: NextRequest) {
  const stylesParam = request.nextUrl.searchParams.get("styles")
  const styles = stylesParam ? stylesParam.split(",").filter(Boolean) : []

  const [shops, artists] = await Promise.all([
    fetchAllPages(shopQuery(null, 0), "id, latitude, longitude, rating", SHOP_LIMIT, "pins shops"),
    fetchAllPages(
      artistQuery(null, styles, 0),
      "id, rating, specialties, shops!inner(latitude, longitude)",
      ARTIST_LIMIT,
      "pins artists"
    ),
  ])

  const shopPins = shops.rows.map((r) => [r.id, round(r.latitude, 5), round(r.longitude, 5), round(r.rating ?? 0, 1)])
  const artistPins = artists.rows.flatMap((r) => {
    const shop = (Array.isArray(r.shops) ? r.shops[0] : r.shops) as Record<string, unknown> | null
    const lat = Number(shop?.latitude ?? 0)
    const lng = Number(shop?.longitude ?? 0)
    if (!lat || !lng) return []
    const primary = Array.isArray(r.specialties) ? (r.specialties as string[])[0] : undefined
    const pin: unknown[] = [r.id, round(lat, 5), round(lng, 5), round(r.rating ?? 0, 1)]
    if (primary) pin.push(primary)
    return [pin]
  })

  return NextResponse.json(
    { v: 1, shops: shopPins, artists: artistPins, totals: { shops: shops.total, artists: artists.total } },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
  )
}
