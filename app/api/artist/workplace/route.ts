import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { isWorkplace, workplacePatch } from "@/lib/workplace"

// "Where do you work?" from the artist dashboard: { workplace: "shop", shopId }
// or { workplace: "private_studio" }. The signed-in artist's own row only.
// Never takes an address.
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: artist } = await supabase
      .from("artists")
      .select("id, city, state, area_latitude")
      .eq("user_id", user.id)
      .maybeSingle()
    if (!artist) return NextResponse.json({ error: "Artist profile not found" }, { status: 403 })

    const body = await req.json()
    if (!isWorkplace(body?.workplace)) return NextResponse.json({ error: "Choose a shop or a private studio" }, { status: 400 })

    const row = artist as { id: string; city: string | null; state: string | null; area_latitude: number | null }
    const result = await workplacePatch(supabase, row, body.workplace, typeof body.shopId === "string" ? body.shopId : null)
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 })

    // shop_id, city, state and the area point are server-only columns: write them
    // with the service role, only to the caller's own row found above.
    const { error } = await createAdminClient().from("artists").update(result.patch).eq("id", row.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
