import { createClient } from "@/utils/supabase/server"

// Mirrors the user_profiles table (id is the auth.users id; row is
// auto-created by the handle_new_user() DB trigger on signup).
// Columns: id, role, email, display_name, avatar_url, city, state,
// subscription_tier, created_at, updated_at
export interface UserProfile {
  userId: string
  role: "artist" | "client"
  subscriptionTier: "free" | "pro" | "shop"
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
      .eq("id", userId)
      .single()
    if (error || !data) return null
    const row = data as Record<string, unknown>
    const city = row.city != null ? String(row.city) : ""
    const state = row.state != null ? String(row.state) : ""
    const location = [city, state].filter(Boolean).join(", ")
    return {
      userId: String(row.id ?? ""),
      role: (row.role as "artist" | "client") ?? "client",
      subscriptionTier: (row.subscription_tier as "free" | "pro" | "shop") ?? "free",
      email: row.email != null ? String(row.email) : undefined,
      name: row.display_name != null ? String(row.display_name) : undefined,
      avatarUrl: row.avatar_url != null ? String(row.avatar_url) : undefined,
      location: location || undefined,
    }
  } catch {
    return null
  }
}

export async function updateUserProfile(
  userId: string,
  updates: { name?: string; email?: string; location?: string }
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient()
    const dbUpdates: Record<string, string> = {}
    if (updates.name !== undefined) dbUpdates.display_name = updates.name
    if (updates.email !== undefined) dbUpdates.email = updates.email
    if (updates.location !== undefined) {
      const [city, state] = updates.location.split(",").map((s) => s.trim())
      dbUpdates.city = city ?? ""
      if (state) dbUpdates.state = state
    }

    const { error } = await supabase
      .from("user_profiles")
      .update(dbUpdates)
      .eq("id", userId)
    return { error: error?.message ?? null }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
