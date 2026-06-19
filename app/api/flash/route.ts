import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const style = searchParams.get("style")
    const state = searchParams.get("state")
    const city = searchParams.get("city")
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    const page = parseInt(searchParams.get("page") ?? "0")
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") ?? "24"), 48)

    const supabase = createClient()
    let query = supabase
      .from("flash_listings")
      .select("*, artists(display_name, handle, avatar_url)", { count: "exact" })
      .eq("is_available", true)

    if (style) query = query.eq("style", style)
    if (state) query = query.eq("state", state.toUpperCase())
    if (city) query = query.ilike("city", `%${city}%`)
    if (minPrice) query = query.gte("price", parseFloat(minPrice))
    if (maxPrice) query = query.lte("price", parseFloat(maxPrice))

    query = query
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    const { data, count, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, count })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Get artist record
    const { data: artist } = await supabase
      .from("artists")
      .select("id, city, state")
      .eq("user_id", user.id)
      .maybeSingle()
    if (!artist) return NextResponse.json({ error: "Artist profile not found" }, { status: 403 })

    // Enforce free tier limit (2 listings)
    const { count } = await supabase
      .from("flash_listings")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", artist.id)

    // TODO: check subscription tier for Pro gating
    const FREE_LIMIT = 2
    if ((count ?? 0) >= FREE_LIMIT) {
      // Check if user is Pro (allow unlimited)
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .maybeSingle()
      const isPro = (profile as { subscription_tier?: string } | null)?.subscription_tier === "pro"
      if (!isPro) {
        return NextResponse.json(
          { error: "Free plan is limited to 2 flash listings. Upgrade to Pro for unlimited." },
          { status: 403 }
        )
      }
    }

    const body = await req.json()
    const { title, description, imageUrl, price, priceMax, style, size, isExclusive } = body

    if (!title || !imageUrl || !price) {
      return NextResponse.json({ error: "title, imageUrl, and price are required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("flash_listings")
      .insert({
        artist_id: artist.id,
        title,
        description: description ?? null,
        image_url: imageUrl,
        price: parseFloat(price),
        price_max: priceMax ? parseFloat(priceMax) : null,
        style: style ?? null,
        size: size ?? null,
        city: artist.city ?? null,
        state: artist.state ?? null,
        is_exclusive: Boolean(isExclusive),
        is_available: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
