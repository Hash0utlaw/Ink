import { NextResponse } from "next/server"
import { getShops } from "@/lib/supabase/shops"
import type { ShopFilters } from "@/lib/supabase/shops"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const stylesParam = searchParams.get("styles")
    const styles = stylesParam ? stylesParam.split(",").filter(Boolean) : []
    const rating = Number(searchParams.get("rating")) || 0
    const acceptsWalkIns = searchParams.get("acceptsWalkIns") === "true"
    const zip = searchParams.get("zip") ?? undefined
    const state = searchParams.get("state") ?? undefined
    const city = searchParams.get("city") ?? undefined
    const query = searchParams.get("query") ?? undefined
    const sortByRaw = searchParams.get("sortBy")
    const validSortBy = ["rating", "review_count", "name"] as const
    const sortBy = validSortBy.includes(sortByRaw as (typeof validSortBy)[number])
      ? (sortByRaw as ShopFilters["sortBy"])
      : undefined
    const page = Number(searchParams.get("page")) || 0

    const { data, count, error } = await getShops({
      styles: styles.length > 0 ? styles : undefined,
      rating: rating > 0 ? rating : undefined,
      acceptsWalkIns: acceptsWalkIns || undefined,
      zip,
      state,
      city,
      query,
      sortBy,
      page,
    })

    if (error) return NextResponse.json({ message: error }, { status: 500 })
    return NextResponse.json({ data, count })
  } catch (err) {
    console.error("Failed to fetch shops:", err)
    return NextResponse.json({ message: "Failed to fetch shops" }, { status: 500 })
  }
}
