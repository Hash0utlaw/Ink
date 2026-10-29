import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"

// The only flash_listings columns an artist may change. No trust fields.
const ALLOWED = ["title", "description", "image_url", "price", "price_max", "style", "size", "is_exclusive", "is_available"]

/**
 * The signed-in artist's id and the listing, if the listing is theirs.
 * Reads with the service role: RLS only shows available listings, so a hidden
 * listing would otherwise look like it isn't the owner's.
 */
async function ownListing(id: string): Promise<{ artistId: string } | NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!artist) return NextResponse.json({ error: "Artist not found" }, { status: 403 })
  const artistId = (artist as { id: string }).id

  const { data: listing } = await createAdminClient()
    .from("flash_listings")
    .select("id")
    .eq("id", id)
    .eq("artist_id", artistId)
    .maybeSingle()
  if (!listing) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  return { artistId }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const own = await ownListing(params.id)
    if (own instanceof NextResponse) return own

    const body = await req.json()
    const updates: Record<string, unknown> = {}
    for (const key of ALLOWED) {
      if (key in body) updates[key] = body[key]
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // Service role, so hiding a listing (is_available = false) isn't refused by
    // the public-read policy. Ownership was checked above; only ALLOWED columns.
    const { data, error } = await createAdminClient()
      .from("flash_listings")
      .update(updates)
      .eq("id", params.id)
      .eq("artist_id", own.artistId)
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
    const own = await ownListing(params.id)
    if (own instanceof NextResponse) return own

    // Service role, so a hidden listing can be deleted too.
    const { error } = await createAdminClient()
      .from("flash_listings")
      .delete()
      .eq("id", params.id)
      .eq("artist_id", own.artistId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
