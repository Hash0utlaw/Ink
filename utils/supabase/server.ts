import { cookies } from "next/headers"
import { createServerClient, type CookieOptions, type SupabaseClient } from "@supabase/ssr"

let cached: SupabaseClient | undefined

/**
 * Returns a singleton Supabase client that works in Server Components,
 * preserving the user's auth cookies automatically.
 */
export function createClient(): SupabaseClient {
  if (cached) return cached

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase URL and Anon Key are required. Please add the Supabase integration or set the environment variables.",
    )
  }

  const cookieStore = cookies()

  // Helper to read / write cookies for Supabase's auth helpers
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  }

  cached = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...cookieOptions, ...options })
      },
      remove(name, options) {
        cookieStore.delete({ name, ...cookieOptions, ...options })
      },
    },
  })

  return cached
}
