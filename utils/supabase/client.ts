import { createBrowserClient, type SupabaseClient } from "@supabase/ssr"

let browserClient: SupabaseClient | undefined

/**
 * Returns a singleton Supabase client for Client Components.
 * Returns null if environment variables are not configured.
 */
export function getClient(): SupabaseClient | null {
  if (browserClient) {
    return browserClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)

  return browserClient
}
