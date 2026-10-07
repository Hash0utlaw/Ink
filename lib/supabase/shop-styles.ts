// Shop styles live in shop_styles (shop_id, style) — the union of a shop's
// active artists' styles, written by scripts/normalize-styles.ts. Shop queries
// embed them with SHOP_STYLES_EMBED; rows that can't (RPC results) use
// fetchShopStyles(), one batched query for all ids.

import type { SupabaseClient } from "@supabase/supabase-js"
import { sortStyleSlugs } from "@/lib/styles"

/** Add to a shops select: "*, " + SHOP_STYLES_EMBED */
export const SHOP_STYLES_EMBED = "shop_styles(style)"

/** Slugs from an embedded shop_styles array, in STYLES order. */
export function shopStylesFromRow(row: Record<string, unknown>): string[] {
  const embed = row.shop_styles
  if (!Array.isArray(embed)) return []
  return sortStyleSlugs(embed.map((e) => String((e as { style?: unknown })?.style ?? "")))
}

// 40 shops × at most 21 styles stays under PostgREST's 1,000-row response cap.
const CHUNK = 40

/** shop id → style slugs for many shops at once (chunked; a few queries, not one per shop). */
export async function fetchShopStyles(supabase: SupabaseClient, shopIds: string[]): Promise<Map<string, string[]>> {
  const raw = new Map<string, string[]>()
  for (let i = 0; i < shopIds.length; i += CHUNK) {
    const { data, error } = await supabase
      .from("shop_styles")
      .select("shop_id, style")
      .in("shop_id", shopIds.slice(i, i + CHUNK))
    if (error) throw new Error(error.message)
    for (const r of data ?? []) raw.set(String(r.shop_id), [...(raw.get(String(r.shop_id)) ?? []), String(r.style)])
  }
  return new Map(Array.from(raw, ([id, styles]) => [id, sortStyleSlugs(styles)]))
}
