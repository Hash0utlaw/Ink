import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Returns a Supabase client scoped to the current request, for use in
 * Server Components, Server Actions, and Route Handlers.
 *
 * IMPORTANT: this must create a fresh client per call rather than caching
 * one at module scope — a cached client would bind the first request's
 * cookies to every subsequent request on a reused server instance (Fluid
 * Compute), leaking one user's session into another user's request.
 */
export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase URL and Anon Key are required. Please add the Supabase integration or set the environment variables.",
    )
  }

  const cookieStore = cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component — cookies are refreshed by middleware instead.
        }
      },
    },
  })
}
