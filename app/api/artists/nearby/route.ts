import { NextResponse } from "next/server"
import { getArtistsNearMe } from "@/lib/supabase/artists"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = Number(searchParams.get("lat"))
    const lng = Number(searchParams.get("lng"))
    const radius = Number(searchParams.get("radius")) || 25
    const rating = Number(searchParams.get("rating")) || 0
    const available = searchParams.get("available") === "true" ? true : undefined

    if (!lat || !lng) {
      return NextResponse.json({ message: "lat and lng are required" }, { status: 400 })
    }

    const { data, error } = await getArtistsNearMe(lat, lng, radius, {
      rating: rating > 0 ? rating : undefined,
      availableNow: available,
    })

    if (error) return NextResponse.json({ message: error }, { status: 500 })
    return NextResponse.json({ data })
  } catch (error) {
    console.error("Failed to fetch nearby artists:", error)
    return NextResponse.json({ message: "Failed to fetch nearby artists" }, { status: 500 })
  }
}
