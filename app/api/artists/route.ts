import { NextResponse } from "next/server"
import { getArtists } from "@/lib/supabase/artists"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const stylesParam = url.searchParams.get("styles")
    const priceParam = url.searchParams.get("price")
    const rating = Number(url.searchParams.get("rating")) || 0
    const availableNow = url.searchParams.get("availableNow") === "true"

    const styles = stylesParam ? stylesParam.split(",").filter(Boolean) : []
    const price = priceParam ? priceParam.split(",").filter(Boolean) : []

    const artists = await getArtists({
      styles: styles.length > 0 ? styles : undefined,
      price: price.length > 0 ? price : undefined,
      rating: rating > 0 ? rating : undefined,
      availableNow: availableNow || undefined,
    })

    return NextResponse.json(artists)
  } catch (error) {
    console.error("Failed to fetch artists:", error)
    return NextResponse.json({ message: "Failed to fetch artists" }, { status: 500 })
  }
}
