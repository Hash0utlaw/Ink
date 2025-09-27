import { NextResponse } from "next/server"
import { getArtists } from "@/lib/mock-data"
import type { Artist } from "@/types/artist"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const stylesParam = url.searchParams.get("styles")
    const priceParam = url.searchParams.get("price")

    const styles = stylesParam ? stylesParam.split(",") : []
    const price = priceParam ? priceParam.split(",") : []
    const rating = Number(url.searchParams.get("rating")) || 0
    const availableNow = url.searchParams.get("availableNow") === "true"

    let artists: Artist[] = await getArtists()

    if (styles.length > 0 && styles[0]) {
      artists = artists.filter((artist) => styles.every((style) => artist.specialties.includes(style)))
    }
    if (price.length > 0 && price[0]) {
      artists = artists.filter((artist) => price.includes(artist.priceRange))
    }
    if (rating > 0) {
      artists = artists.filter((artist) => artist.rating >= rating)
    }
    if (availableNow) {
      artists = artists.filter((artist) => artist.isAvailable)
    }

    return NextResponse.json(artists)
  } catch (error) {
    console.error("Failed to fetch artists:", error)
    return NextResponse.json({ message: "Failed to fetch artists" }, { status: 500 })
  }
}
