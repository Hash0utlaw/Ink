"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export async function login(prevState: any, formData: FormData) {
  const supabase = createClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const next = formData.get("next") as string | null

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`,
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000"

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/reset-password`,
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
