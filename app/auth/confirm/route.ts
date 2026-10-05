import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType, User } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { linkClaimedProfiles } from "@/lib/link-claims"
import { safeNextPath } from "@/lib/safe-next"

export const dynamic = "force-dynamic"

const EMAIL_OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"]

// Landing page for Supabase email links (sign-up confirmation etc.). Handles
// both the PKCE (?code=) and token-hash (?token_hash=&type=) link formats.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = safeNextPath(searchParams.get("next"))

  const supabase = createClient()
  let user: User | null = null

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) user = data.user
  } else if (tokenHash && type && EMAIL_OTP_TYPES.includes(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) user = data.user
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=confirm_failed", origin))
  }

  try {
    await linkClaimedProfiles(user.id, user.email)
  } catch (e) {
    console.error("[auth/confirm] linking claimed profiles failed:", e)
  }

  if (next) {
    return NextResponse.redirect(new URL(next, origin))
  }

  // Role is read after linking, so a newly linked artist lands on their dashboard.
  const { data: profile } = await createAdminClient()
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  const role = (profile as { role?: string } | null)?.role
  return NextResponse.redirect(new URL(role === "artist" ? "/artist-dashboard" : "/dashboard", origin))
}
