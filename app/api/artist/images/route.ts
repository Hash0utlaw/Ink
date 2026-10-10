import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { PORTFOLIO_PUBLIC_PREFIX } from "@/lib/utils/safe-image"

// Which column each kind sets, and the storage folder its files must live in.
const KINDS = {
  avatar: { column: "avatar_url", folder: "avatars" },
  cover: { column: "cover_image_url", folder: "covers" },
} as const

/**
 * Sets or clears the signed-in artist's profile photo or cover image.
 * Body: { kind: "avatar" | "cover", url: string | null }. The URL must be a file
 * in that artist's own storage folder (portfolio/{avatars|covers}/{artist_id}/).
 */
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
    const artistId = (artist as { id: string }).id

    const body = (await req.json()) as { kind?: string; url?: unknown }
    const kind = KINDS[body.kind as keyof typeof KINDS]
    if (!kind) return NextResponse.json({ error: "Unknown image kind" }, { status: 400 })

    const url = body.url == null || body.url === "" ? null : String(body.url)
    if (url !== null && (!url.startsWith(`${PORTFOLIO_PUBLIC_PREFIX}${kind.folder}/${artistId}/`) || url.includes(".."))) {
      return NextResponse.json({ error: "That image isn't in your upload folder." }, { status: 400 })
    }

    const { error } = await supabase
      .from("artists")
      .update({ [kind.column]: url })
      .eq("id", artistId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
