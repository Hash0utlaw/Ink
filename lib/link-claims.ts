import { createAdminClient } from "@/utils/supabase/admin"

// Escape LIKE wildcards so the ilike below is an exact, case-insensitive match.
function likeExact(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

type ClaimLink = {
  id: string
  artist_id: string | null
  shop_id: string | null
  claim_request_id: string | null
  claim_requests: { status: string } | null
}

/**
 * Links artists/shops from approved claims (claim_links rows, written by the
 * admin approve action) whose email matches the signed-in user. Each unlinked
 * row is used once: the listing is linked only if it has no owner yet, then
 * the row gets linked_at, so repeat logins change nothing.
 * A row tied to a claim_request is used only while that claim is still
 * approved (a rejected claim can't link); rows with no claim_request_id were
 * added by hand and are always allowed.
 * claim_links is service-role only (RLS on, no policies) — never expose it.
 */
export async function linkClaimedProfiles(userId: string, email: string | null | undefined) {
  if (!email?.trim()) return { artists: 0, shops: 0 }
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("claim_links")
    .select("id, artist_id, shop_id, claim_request_id, claim_requests(status)")
    .ilike("email", likeExact(email.trim()))
    .is("linked_at", null)
  if (error) {
    console.error("[link-claims] claim_links:", error.message)
    return { artists: 0, shops: 0 }
  }

  let artistCount = 0
  let shopCount = 0
  const usable = ((data ?? []) as unknown as ClaimLink[]).filter(
    (link) => !link.claim_request_id || link.claim_requests?.status === "approved",
  )
  for (const link of usable) {
    if (link.artist_id) {
      const { data: linked, error: artistError } = await admin
        .from("artists")
        .update({ user_id: userId, is_claimed: true, is_verified: true })
        .eq("id", link.artist_id)
        .is("user_id", null)
        .select("id")
      if (artistError) {
        console.error("[link-claims] artist:", artistError.message)
        continue // leave linked_at null so the next login retries
      }
      artistCount += linked?.length ?? 0
    } else if (link.shop_id) {
      const { data: linked, error: shopError } = await admin
        .from("shops")
        .update({ owner_user_id: userId, is_verified: true })
        .eq("id", link.shop_id)
        .is("owner_user_id", null)
        .select("id")
      if (shopError) {
        console.error("[link-claims] shop:", shopError.message)
        continue
      }
      shopCount += linked?.length ?? 0
    }

    // Used — whether it linked now or the listing already had an owner.
    const { error: markError } = await admin
      .from("claim_links")
      .update({ linked_at: new Date().toISOString() })
      .eq("id", link.id)
      .is("linked_at", null)
    if (markError) console.error("[link-claims] mark linked:", markError.message)
  }

  if (artistCount > 0) {
    const { error: roleError } = await admin.from("user_profiles").update({ role: "artist" }).eq("id", userId)
    if (roleError) console.error("[link-claims] role:", roleError.message)
  }

  return { artists: artistCount, shops: shopCount }
}
