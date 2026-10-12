import { NextResponse } from "next/server"
import { findArtists, MAX_STYLES, styleCountsNear, toCoords, toRadius } from "@/lib/finder"
import { toStyleSlugs } from "@/lib/styles"

export const dynamic = "force-dynamic"

// GET /api/finder/style-counts?lat=&lng=&r=25            → { counts: { japanese: 36, __all: 657, __none: 235, ... } }
// GET /api/finder/style-counts?lat=&lng=&r=25&styles=a,b → { total: 41 }, the "Show n artists" number
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const coords = toCoords(searchParams.get("lat"), searchParams.get("lng"))
    if (!coords) return NextResponse.json({ message: "lat and lng are required" }, { status: 400 })
    const radius = toRadius(searchParams.get("r"))

    const stylesParam = searchParams.get("styles")
    if (stylesParam !== null) {
      const styles = toStyleSlugs(stylesParam.split(",").filter(Boolean)).slice(0, MAX_STYLES)
      const { total, error } = await findArtists({ ...coords, radius, styles, limit: 1 })
      if (error) return NextResponse.json({ message: error }, { status: 500 })
      return NextResponse.json({ total })
    }

    return NextResponse.json({ counts: await styleCountsNear(coords.lat, coords.lng, radius) })
  } catch (error) {
    console.error("Finder style counts failed:", error)
    return NextResponse.json({ message: "Style counts failed" }, { status: 500 })
  }
}
