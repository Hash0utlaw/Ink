import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import type { MapAreaArtist } from "@/lib/mapbox"
import { AREA_LIST_COLUMNS } from "@/lib/map-data"
import { displayName } from "@/lib/display-name"
import { toStyleSlugs } from "@/lib/styles"

export const dynamic = "force-dynamic"

// The list behind one navy city circle on the map: active artists with no shop
// at ?lat=&lng= (a 2-decimal city point from /api/map/pins), most followed
// first. Names, follower counts and the "Private studio" flag only: never an
// address or a finer point.
const MAX_ROWS = 50
const POINT = /^-?\d{1,3}\.\d{2}$/

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat = searchParams.get("lat") ?? ""
  const lng = searchParams.get("lng") ?? ""
  if (!POINT.test(lat) || !POINT.test(lng)) {
    return NextResponse.json({ error: "lat and lng must be 2-decimal city points" }, { status: 400 })
  }
  const styles = toStyleSlugs((searchParams.get("styles") ?? "").split(",").filter(Boolean))

  const supabase = createClient()
  let q = supabase
    .from("artists")
    .select(AREA_LIST_COLUMNS, { count: "exact" })
    .eq("is_active", true)
    .is("shop_id", null)
    .eq("area_latitude", lat)
    .eq("area_longitude", lng)
  if (styles.length > 0) q = q.overlaps("styles", styles)
  const { data, count, error } = await q
    .order("instagram_followers", { ascending: false, nullsFirst: false })
    .order("display_name", { ascending: true })
    .limit(MAX_ROWS)
  if (error) {
    console.error("[api/map/area] error:", error.message)
    return NextResponse.json({ error: "Couldn't load this area" }, { status: 500 })
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  const artists: MapAreaArtist[] = rows.map((r) => ({
    id: String(r.id),
    name: displayName(String(r.display_name ?? "")),
    followers: r.instagram_followers != null ? Number(r.instagram_followers) : null,
    privateStudio: r.is_private_studio === true,
  }))
  const tally = new Map<string, number>()
  for (const r of rows) {
    const city = String(r.city ?? "").trim()
    if (city) tally.set(city, (tally.get(city) ?? 0) + 1)
  }
  const city = Array.from(tally.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""
  const state = String(rows[0]?.state ?? "")

  return NextResponse.json(
    { city, state, total: count ?? artists.length, artists },
    { headers: { "Cache-Control": "public, s-maxage=300" } },
  )
}
