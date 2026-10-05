"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { SITE_URL } from "@/lib/site-config"
import { linkClaimedProfiles } from "@/lib/link-claims"
import { safeNextPath } from "@/lib/safe-next"
import type { EmailOtpType } from "@supabase/supabase-js"

export async function login(prevState: any, formData: FormData) {
  const supabase = createClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const next = safeNextPath(formData.get("next") as string | null)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      success: false,
      message: error.message,
    }
  }

  if (data.user) {
    try {
      await linkClaimedProfiles(data.user.id, data.user.email)
    } catch (e) {
      console.error("[login] linking claimed profiles failed:", e)
    }
  }

  revalidatePath("/", "layout")

  if (next) {
    redirect(next)
  }

  if (data.user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle()
    if ((profile as { role?: string } | null)?.role === "artist") {
      redirect("/artist-dashboard")
    }
  }

  redirect("/dashboard")
}

export async function signup(prevState: any, formData: FormData) {
  const supabase = createClient()

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const role = formData.get("role") as "artist" | "client"
  const next = safeNextPath(formData.get("next") as string | null)

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/confirm${next ? `?next=${encodeURIComponent(next)}` : ""}`,
      data: {
        role,
        full_name: name,
      },
    },
  })

  if (error) {
    return {
      success: false,
      message: error.message,
    }
  }

  // Only link when Supabase returned a session, i.e. the email is already
  // confirmed. Otherwise linking happens on first login after confirmation.
  if (data.session && data.user) {
    try {
      await linkClaimedProfiles(data.user.id, data.user.email)
    } catch (e) {
      console.error("[signup] linking claimed profiles failed:", e)
    }
  }

  return {
    success: true,
    message: "Check your email to continue the sign up process",
  }
}

export async function signout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function forgotPassword(prevState: any, formData: FormData) {
  const supabase = createClient()

  const email = formData.get("email") as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/reset-password`,
  })

  if (error) {
    return {
      success: false,
      message: error.message,
    }
  }

  return {
    success: true,
    message: "Password reset link sent! Check your email inbox.",
  }
}

// Establishes the recovery session from a password-reset link (?code= or
// ?token_hash=&type=recovery). Runs as a server action so the session cookies
// can be set.
export async function verifyRecoveryLink(params: {
  code?: string | null
  tokenHash?: string | null
  type?: string | null
}): Promise<{ ok: boolean }> {
  const supabase = createClient()

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code)
    return { ok: !error }
  }
  if (params.tokenHash && params.type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: params.tokenHash,
      type: params.type as EmailOtpType,
    })
    return { ok: !error }
  }
  return { ok: false }
}

export async function updatePassword(prevState: any, formData: FormData) {
  const password = (formData.get("password") as string) ?? ""
  const confirm = (formData.get("confirm") as string) ?? ""

  if (password.length < 8) {
    return { success: false, message: "Password must be at least 8 characters." }
  }
  if (password !== confirm) {
    return { success: false, message: "Passwords don't match." }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return { success: false, message: error.message }
  }

  await supabase.auth.signOut()
  redirect("/login?reset=1")
}
