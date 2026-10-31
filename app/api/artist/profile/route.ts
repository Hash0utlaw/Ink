import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { PROFILE_FIELDS, validateProfileDetails } from "@/lib/profile-details"
import { RATE_LIMIT_MESSAGE, allowUserAction } from "@/lib/rate-limit"

// "Profile details" from the artist dashboard. The signed-in artist's own
// claimed row only. Takes PROFILE_FIELDS and nothing else: anything else in the
// body (trust fields, ownership, handle, ratings, follower counts) is ignored.
// The page's URL (handle) never changes, even when the name does.
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: artist } = await supabase
      .from("artists")
      .select("id, instagram_handle")
      .eq("user_id", user.id)
      .eq("is_claimed", true)
      .maybeSingle()
    if (!artist) return NextResponse.json({ error: "Artist profile not found" }, { status: 403 })

    if (!(await allowUserAction("profile", user.id))) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Nothing to save" }, { status: 400 })
    }
    const sent = Object.fromEntries(PROFILE_FIELDS.filter((k) => k in body).map((k) => [k, (body as Record<string, unknown>)[k]]))
    if (Object.keys(sent).length === 0) return NextResponse.json({ error: "Nothing to save" }, { status: 400 })

    const result = validateProfileDetails(sent)
    if (result.errors) {
      return NextResponse.json({ error: "Some fields need fixing", fields: result.errors }, { status: 400 })
    }

    const row = artist as { id: string; instagram_handle: string | null }
    const patch: Record<string, unknown> = { ...result.patch }
    // A new Instagram account: drop the old account's follower count until the next check.
    if ("instagram_handle" in patch && (patch.instagram_handle ?? null) !== (row.instagram_handle ?? null)) {
      patch.instagram_followers = null
      patch.instagram_checked_at = null
    }
    // One side of the hourly range alone is checked against the stored other side.
    if (("hourly_rate_min" in patch) !== ("hourly_rate_max" in patch)) {
      const { data: rates } = await supabase.from("artists").select("hourly_rate_min, hourly_rate_max").eq("id", row.id).maybeSingle()
      const stored = (rates ?? {}) as { hourly_rate_min?: number | null; hourly_rate_max?: number | null }
      const min = ("hourly_rate_min" in patch ? patch.hourly_rate_min : stored.hourly_rate_min) as number | null | undefined
      const max = ("hourly_rate_max" in patch ? patch.hourly_rate_max : stored.hourly_rate_max) as number | null | undefined
      if (min != null && max != null && min > max) {
        return NextResponse.json(
          { error: "Some fields need fixing", fields: { hourly_rate_max: "Must be at least your starting rate." } },
          { status: 400 },
        )
      }
    }

    // These columns have no client grant: write them with the service role, only
    // to the caller's own row found above.
    const { error } = await createAdminClient().from("artists").update(patch).eq("id", row.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
