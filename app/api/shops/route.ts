import { NextResponse } from "next/server"
import { getShops } from "@/lib/supabase/shops"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const stylesParam = url.searchParams.get("styles")
    const rating = Number(url.searchParams.get("rating")) || 0
    const acceptsWalkIns = url.searchParams.get("acceptsWalkIns") === "true"

    const styles = stylesParam ? stylesParam.split(",").filter(Boolean) : []

    const shops = await getShops({
      styles: styles.length > 0 ? styles : undefined,
      rating: rating > 0 ? rating : undefined,
      acceptsWalkIns: acceptsWalkIns || undefined,
    })

    return NextResponse.json(shops)
  } catch (error) {
    console.error("Failed to fetch shops:", error)
    return NextResponse.json({ message: "Failed to fetch shops" }, { status: 500 })
  }
}
