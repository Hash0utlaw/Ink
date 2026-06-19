import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: artist } = await supabase
      .from("artists")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
    if (!artist) return NextResponse.json({ error: "Artist not found" }, { status: 403 })

    // Verify ownership
    const { data: listing } = await supabase
      .from("flash_listings")
      .select("id, artist_id")
      .eq("id", params.id)
      .single()
    if (!listing || (listing as { artist_id: string }).artist_id !== (artist as { id: string }).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const allowed = ["title", "description", "image_url", "price", "price_max", "style", "size", "is_exclusive", "is_available"]
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    const { data, error } = await supabase
      .from("flash_listings")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: artist } = await supabase
      .from("artists")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
    if (!artist) return NextResponse.json({ error: "Artist not found" }, { status: 403 })

    const { error } = await supabase
      .from("flash_listings")
      .delete()
      .eq("id", params.id)
      .eq("artist_id", (artist as { id: string }).id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
