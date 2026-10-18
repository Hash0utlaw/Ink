// "Where do you work?" for a claimed artist (dashboard, or the claim form once
// the claim is approved). Server only.
//   shop            → shop_id = that active shop (its city and state), is_private_studio = false
//   private_studio  → is_private_studio = true, shop_id = null, and a city-center
//                     point if they don't have one yet (lookupPlace on their city,
//                     2 decimals). City only: we never take an address.
// "Leave as is" never reaches here.

import type { SupabaseClient } from "@supabase/supabase-js"
import { lookupPlace } from "@/lib/finder"

export type Workplace = "shop" | "private_studio"

export const isWorkplace = (v: unknown): v is Workplace => v === "shop" || v === "private_studio"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const round2 = (n: number) => Math.round(n * 100) / 100

interface ArtistPlace {
  city: string | null
  state: string | null
  area_latitude: number | string | null
}

/** The artists columns to write for a choice, or a message for the artist. */
export async function workplacePatch(
  supabase: SupabaseClient,
  artist: ArtistPlace,
  choice: Workplace,
  shopId?: string | null,
): Promise<{ patch: Record<string, unknown> } | { error: string }> {
  if (choice === "shop") {
    if (!shopId || !UUID.test(shopId)) return { error: "Pick the shop you work at." }
    const { data: shop } = await supabase.from("shops").select("id, city, state").eq("id", shopId).eq("is_active", true).maybeSingle()
    if (!shop) return { error: "That shop isn't listed. Pick another, or choose Leave as is." }
    const s = shop as { id: string; city: string | null; state: string | null }
    return { patch: { shop_id: s.id, is_private_studio: false, city: s.city, state: s.state } }
  }

  const patch: Record<string, unknown> = { is_private_studio: true, shop_id: null }
  if (artist.area_latitude == null) {
    const place = artist.city && artist.state ? await lookupPlace(`${artist.city}, ${artist.state}`) : null
    if (!place) return { error: "We need your city to list a private studio. Add it to your profile first." }
    patch.area_latitude = round2(place.lat)
    patch.area_longitude = round2(place.lng)
  }
  return { patch }
}
