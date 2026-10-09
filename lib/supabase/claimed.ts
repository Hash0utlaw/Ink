import { unstable_cache } from "next/cache"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// unstable_cache can't read cookies, so the cached query uses a plain anon client.
function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createSupabaseClient(url, key, { auth: { persistSession: false } })
}

/**
 * Active claimed artists. Availability is only real for claimed artists (the
 * column defaults to "available"), so availability UI stays hidden until this
 * is above zero. Cached for an hour.
 */
export const getClaimedArtistCount = unstable_cache(
  async (): Promise<number> => {
    const supabase = anonClient()
    if (!supabase) return 0
    const { count, error } = await supabase
      .from("artists")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("is_claimed", true)
    return error ? 0 : count ?? 0
  },
  ["claimed-artist-count"],
  { revalidate: 3600 }
)
