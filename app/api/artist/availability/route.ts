import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: artist } = await supabase
      .from("artists")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
    if (!artist) return NextResponse.json({ error: "Artist profile not found" }, { status: 403 })

    const body = await req.json()
    const allowed = ["availability_status", "avg_response_hours", "price_tier", "first_booking_discount"]
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key] === "" ? null : body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const { error } = await supabase
      .from("artists")
      .update(updates)
      .eq("id", (artist as { id: string }).id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
