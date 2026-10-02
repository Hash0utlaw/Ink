import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import type { MapboxLocation } from "@/lib/mapbox"
import { ARTIST_JOIN_COLUMNS, SHOP_COLUMNS, artistRowToMapLocation, shopToMapLocation } from "@/lib/map-data"

export const dynamic = "force-dynamic"

// Full MapboxLocation records (ids keep their "shop-"/"artist-" prefixes) for
// the sidebar cards and LocationDetails. ?shops=id,…&artists=id,… with raw
// UUIDs, at most MAX_IDS in total. Active records only.
const MAX_IDS = 100
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const parseIds = (raw: string | null) => (raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [])

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const shopIds = parseIds(searchParams.get("shops"))
  const artistIds = parseIds(searchParams.get("artists"))

  if (shopIds.length + artistIds.length > MAX_IDS) {
    return NextResponse.json({ error: `At most ${MAX_IDS} ids per request` }, { status: 400 })
  }
  if ([...shopIds, ...artistIds].some((id) => !UUID.test(id))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  const supabase = createClient()
  const [shops, artists] = await Promise.all([
    shopIds.length
      ? supabase.from("shops").select(SHOP_COLUMNS).in("id", shopIds).eq("is_active", true)
      : Promise.resolve({ data: [], error: null }),
    artistIds.length
      ? supabase
          .from("artists")
          .select(ARTIST_JOIN_COLUMNS)
          .in("id", artistIds)
          .eq("is_active", true)
          .eq("shops.is_active", true)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (shops.error) console.error("[api/map/details] shops error:", shops.error.message)
  if (artists.error) console.error("[api/map/details] artists error:", artists.error.message)

  const data: MapboxLocation[] = []
  for (const row of (shops.data ?? []) as unknown as Record<string, unknown>[]) {
    const loc = shopToMapLocation(row)
    if (loc) data.push(loc)
  }
  for (const row of (artists.data ?? []) as unknown as Record<string, unknown>[]) {
    const loc = artistRowToMapLocation(row)
    if (loc) data.push(loc)
  }

  return NextResponse.json({ data }, { headers: { "Cache-Control": "public, s-maxage=300" } })
}
