import { NextResponse } from "next/server"
import { getShopsNearMe } from "@/lib/supabase/shops"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = Number(searchParams.get("lat"))
    const lng = Number(searchParams.get("lng"))
    const radius = Number(searchParams.get("radius")) || 25
    const rating = Number(searchParams.get("rating")) || 0
    const walkInsParam = searchParams.get("walkIns")
    const walkIns = walkInsParam === null ? null : walkInsParam === "true"

    if (!lat || !lng) {
      return NextResponse.json({ message: "lat and lng are required" }, { status: 400 })
    }

    const { data, error } = await getShopsNearMe(lat, lng, radius, {
      rating: rating > 0 ? rating : undefined,
      acceptsWalkIns: walkIns ?? undefined,
    })

    if (error) return NextResponse.json({ message: error }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    console.error("Failed to fetch nearby shops:", err)
    return NextResponse.json({ message: "Failed to fetch nearby shops" }, { status: 500 })
  }
}
