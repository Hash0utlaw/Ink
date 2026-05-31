import { createClient } from "@/utils/supabase/server"

// Mirrors the user_profiles table created in app/(auth)/actions.ts.
// Columns: user_id, role, created_at, subscription_tier
// (plus optional: email, name, avatar_url, location)
export interface UserProfile {
  userId: string
  role: "artist" | "client"
  subscriptionTier: "free" | "pro"
  email?: string
  name?: string
  avatarUrl?: string
  location?: string
}

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single()
    if (error || !data) return null
    const row = data as Record<string, unknown>
    return {
      userId: String(row.user_id ?? ""),
      role: (row.role as "artist" | "client") ?? "client",
      subscriptionTier: (row.subscription_tier as "free" | "pro") ?? "free",
      email: row.email != null ? String(row.email) : undefined,
      name: row.name != null ? String(row.name) : undefined,
      avatarUrl: row.avatar_url != null ? String(row.avatar_url) : undefined,
      location: row.location != null ? String(row.location) : undefined,
    }
  } catch {
    return null
  }
}
