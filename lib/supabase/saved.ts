import { createClient } from "@/utils/supabase/server"
import type { Artist } from "@/types/artist"
import type { Shop } from "@/types/shop"
import { getArtistsByIds } from "./artists"
import { getShopsByIds } from "./shops"
import { getCurrentUserId } from "./users"

export type SavedItemType = "artist" | "shop"

export async function getSavedIdsForUser(
  userId: string,
  itemType?: SavedItemType
): Promise<string[]> {
  try {
    const supabase = createClient()
    let query = supabase.from("saved_items").select("item_id").eq("user_id", userId)
    if (itemType) {
      query = query.eq("item_type", itemType)
    }
    const { data, error } = await query
    if (error || !data) return []
    return (data as { item_id: string }[]).map((row) => row.item_id)
  } catch {
    return []
  }
}

export async function getSavedItems(userId: string): Promise<{ artists: Artist[]; shops: Shop[] }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("saved_items")
      .select("item_type, item_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error || !data) return { artists: [], shops: [] }

    const rows = data as { item_type: SavedItemType; item_id: string }[]
    const artistIds = rows.filter((r) => r.item_type === "artist").map((r) => r.item_id)
    const shopIds = rows.filter((r) => r.item_type === "shop").map((r) => r.item_id)

    const [artists, shops] = await Promise.all([
      getArtistsByIds(artistIds),
      getShopsByIds(shopIds),
    ])

    return { artists, shops }
  } catch {
    return { artists: [], shops: [] }
  }
}

export async function toggleSaved(
  itemType: SavedItemType,
  itemId: string
): Promise<{ saved: boolean; error: string | null }> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return { saved: false, error: "not_signed_in" }

    const supabase = createClient()
    const { data: existing } = await supabase
      .from("saved_items")
      .select("id")
      .eq("user_id", userId)
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase.from("saved_items").delete().eq("id", existing.id)
      if (error) return { saved: true, error: error.message }
      return { saved: false, error: null }
    }

    const { error } = await supabase
      .from("saved_items")
      .insert({ user_id: userId, item_type: itemType, item_id: itemId })
    if (error) return { saved: false, error: error.message }
    return { saved: true, error: null }
  } catch (e: unknown) {
    return { saved: false, error: (e as Error).message }
  }
}
