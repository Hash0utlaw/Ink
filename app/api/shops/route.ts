import { NextResponse } from "next/server"
import { getShops } from "@/lib/mock-data"
import type { Shop } from "@/types/shop"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const stylesParam = url.searchParams.get("styles")

    const styles = stylesParam ? stylesParam.split(",") : []
    const rating = Number(url.searchParams.get("rating")) || 0
    const acceptsWalkIns = url.searchParams.get("acceptsWalkIns") === "true"

    let shops: Shop[] = await getShops()

    if (styles.length > 0 && styles[0]) {
      shops = shops.filter((shop) => styles.every((style) => shop.specialties.includes(style)))
    }
    if (rating > 0) {
      shops = shops.filter((shop) => shop.rating >= rating)
    }
    if (acceptsWalkIns) {
      shops = shops.filter((shop) => shop.acceptsWalkIns)
    }

    return NextResponse.json(shops)
  } catch (error) {
    console.error("Failed to fetch shops:", error)
    return NextResponse.json({ message: "Failed to fetch shops" }, { status: 500 })
  }
}
