import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { updateUserProfile } from "@/lib/supabase/users"
import { SITE_URL } from "@/lib/site-config"
import { MAX, isValidEmail, optionalText } from "@/lib/validation"

export const dynamic = "force-dynamic"

// Saves name and location. A new email address is never written here: it goes
// to Supabase Auth, which emails a confirmation link, and the confirmed address
// is copied to user_profiles by the on_auth_user_email_changed trigger.
export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, message: "Not signed in" }, { status: 401 })
  }

  const body = await request.json()
  const name = optionalText(body.name, MAX.name)
  const location = optionalText(body.location, MAX.short)
  if (name === undefined || location === undefined) {
    return NextResponse.json({ success: false, message: "Name or location is too long." }, { status: 400 })
  }

  const { error } = await updateUserProfile(user.id, {
    ...(body.name !== undefined && { name: name ?? "" }),
    ...(body.location !== undefined && { location: location ?? "" }),
  })
  if (error) {
    return NextResponse.json({ success: false, message: error }, { status: 500 })
  }

  let emailPending = false
  const email = typeof body.email === "string" ? body.email.trim() : ""
  if (email && email.toLowerCase() !== user.email?.toLowerCase()) {
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: "That email address isn't valid." }, { status: 400 })
    }
    const { error: emailError } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${SITE_URL}/auth/confirm?next=/dashboard/profile` },
    )
    if (emailError) {
      return NextResponse.json({ success: false, message: emailError.message }, { status: 400 })
    }
    emailPending = true
  }

  return NextResponse.json({ success: true, emailPending })
}
