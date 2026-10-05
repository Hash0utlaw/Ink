import { createAdminClient } from "@/utils/supabase/admin"

// Escape LIKE wildcards so the ilike below is an exact, case-insensitive match.
function likeExact(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

/**
 * Links artists/shops whose approved claim_email matches the signed-in user.
 * Only touches rows that have no owner yet, so repeat logins change nothing.
 */
export async function linkClaimedProfiles(userId: string, email: string | null | undefined) {
  if (!email) return { artists: 0, shops: 0 }
  const admin = createAdminClient()
  const pattern = likeExact(email.trim())

  const { data: artists, error: artistError } = await admin
    .from("artists")
    .update({ user_id: userId, is_claimed: true, is_verified: true })
    .ilike("claim_email", pattern)
    .is("user_id", null)
    .select("id")
  if (artistError) console.error("[link-claims] artists:", artistError.message)

  const { data: shops, error: shopError } = await admin
    .from("shops")
    .update({ owner_user_id: userId, is_verified: true })
    .ilike("claim_email", pattern)
    .is("owner_user_id", null)
    .select("id")
  if (shopError) console.error("[link-claims] shops:", shopError.message)

  const artistCount = artists?.length ?? 0
  if (artistCount > 0) {
    const { error } = await admin.from("user_profiles").update({ role: "artist" }).eq("id", userId)
    if (error) console.error("[link-claims] role:", error.message)
  }

  return { artists: artistCount, shops: shops?.length ?? 0 }
}
