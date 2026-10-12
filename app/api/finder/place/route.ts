import { NextResponse } from "next/server"
import { lookupPlace, nearLabel, toCoords } from "@/lib/finder"

export const dynamic = "force-dynamic"

// GET /api/finder/place?q=Tampa, FL   → { place: { label, lat, lng } } or { place: null }
// GET /api/finder/place?lat=&lng=     → { place: { label: "Near Tampa, FL", lat, lng } }
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const coords = toCoords(searchParams.get("lat"), searchParams.get("lng"))
    if (coords) {
      return NextResponse.json({ place: { label: await nearLabel(coords.lat, coords.lng), ...coords } })
    }
    const q = (searchParams.get("q") ?? "").slice(0, 100)
    if (!q.trim()) return NextResponse.json({ message: "q or lat and lng are required" }, { status: 400 })
    return NextResponse.json({ place: await lookupPlace(q) })
  } catch (error) {
    console.error("Finder place lookup failed:", error)
    return NextResponse.json({ message: "Place lookup failed" }, { status: 500 })
  }
}
