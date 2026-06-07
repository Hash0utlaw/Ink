import { NextResponse } from "next/server"
import { getArtists } from "@/lib/supabase/artists"
import type { ArtistFilters } from "@/lib/supabase/artists"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const stylesParam = searchParams.get("styles")
    const styles = stylesParam ? stylesParam.split(",").filter(Boolean) : []
    const priceParam = searchParams.get("price")
    const price = priceParam ? priceParam.split(",").filter(Boolean) : []
    const rating = Number(searchParams.get("rating")) || 0
    const availableNow = searchParams.get("availableNow") === "true"
    const query = searchParams.get("query") ?? undefined
    const city = searchParams.get("city") ?? undefined
    const state = searchParams.get("state") ?? undefined
    const zip = searchParams.get("zip") ?? undefined
    const sortByRaw = searchParams.get("sortBy")
    const validSortBy = ["rating", "review_count", "name"] as const
    const sortBy = validSortBy.includes(sortByRaw as (typeof validSortBy)[number])
      ? (sortByRaw as ArtistFilters["sortBy"])
      : undefined
    const page = searchParams.has("page") ? (Number(searchParams.get("page")) || 0) : undefined

    const { data, count, error } = await getArtists({
      styles: styles.length > 0 ? styles : undefined,
      price: price.length > 0 ? price : undefined,
      rating: rating > 0 ? rating : undefined,
      availableNow: availableNow || undefined,
      query,
      city,
      state,
      zip,
      sortBy,
      page,
    })

    if (error) return NextResponse.json({ message: error }, { status: 500 })
    return NextResponse.json({ data, count })
  } catch (error) {
    console.error("Failed to fetch artists:", error)
    return NextResponse.json({ message: "Failed to fetch artists" }, { status: 500 })
  }
}
