import { createClient } from "@/utils/supabase/server"
import { displayName } from "@/lib/display-name"
import { allowedImageSrc, PORTFOLIO_PUBLIC_PREFIX } from "@/lib/utils/safe-image"

// Public portfolio photos: portfolio_images rows that are active and stored in
// our own bucket (work an artist uploaded to TattooMaps), in display_order.
// Hidden rows (is_active = false) never show. Artists manage theirs at
// /artist-dashboard/portfolio through app/api/artist/portfolio.

export interface PortfolioPhoto {
  id: string
  url: string
  caption: string | null
  style: string | null
}

const uploadedOnly = `${PORTFOLIO_PUBLIC_PREFIX}%`

function toPhoto(row: Record<string, unknown>): PortfolioPhoto | null {
  const url = allowedImageSrc(String(row.image_url ?? ""))
  if (!url) return null
  return {
    id: String(row.id),
    url,
    caption: row.caption ? String(row.caption) : null,
    style: row.style ? String(row.style) : null,
  }
}

/** An artist's public portfolio, in the order they set. */
export async function getPortfolio(artistId: string): Promise<PortfolioPhoto[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("portfolio_images")
      .select("id, image_url, caption, style")
      .eq("artist_id", artistId)
      .eq("is_active", true)
      .like("image_url", uploadedOnly)
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
    if (error || !data) return []
    return data.map(toPhoto).filter((p): p is PortfolioPhoto => p != null)
  } catch {
    return []
  }
}

/** Each artist's first public photo, for cards when they have no avatar. */
export async function getFirstPhotos(artistIds: string[]): Promise<Map<string, string>> {
  const first = new Map<string, string>()
  const ids = Array.from(new Set(artistIds.filter(Boolean)))
  if (ids.length === 0) return first
  try {
    const supabase = createClient()
    for (let i = 0; i < ids.length; i += 100) {
      const { data, error } = await supabase
        .from("portfolio_images")
        .select("artist_id, image_url")
        .in("artist_id", ids.slice(i, i + 100))
        .eq("is_active", true)
        .like("image_url", uploadedOnly)
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
      if (error || !data) continue
      for (const row of data as { artist_id: string; image_url: string }[]) {
        const url = allowedImageSrc(row.image_url)
        if (url && !first.has(row.artist_id)) first.set(row.artist_id, url)
      }
    }
  } catch {
    // Cards fall back to initials.
  }
  return first
}

/** Sets cardPhotoUrl on artists without an avatar to their first public photo. */
export async function withCardPhotos<T extends { id: string; avatarUrl: string; cardPhotoUrl?: string | null }>(
  artists: T[],
): Promise<T[]> {
  const missing = artists.filter((a) => !allowedImageSrc(a.avatarUrl)).map((a) => a.id)
  if (missing.length === 0) return artists
  const first = await getFirstPhotos(missing)
  if (first.size === 0) return artists
  return artists.map((a) => (first.has(a.id) ? { ...a, cardPhotoUrl: first.get(a.id) } : a))
}

export interface ShopWorkPhoto extends PortfolioPhoto {
  artistId: string
  artistName: string
}

/** Up to `limit` of the newest public photos from a shop's active artists. */
export async function getShopWork(shopId: string, limit = 8): Promise<ShopWorkPhoto[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("portfolio_images")
      .select("id, image_url, caption, style, artist_id, artists!inner(display_name, shop_id, is_active)")
      .eq("artists.shop_id", shopId)
      .eq("artists.is_active", true)
      .eq("is_active", true)
      .like("image_url", uploadedOnly)
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error || !data) return []
    return (data as Record<string, unknown>[]).flatMap((row) => {
      const photo = toPhoto(row)
      if (!photo) return []
      const artist = (Array.isArray(row.artists) ? row.artists[0] : row.artists) as { display_name?: string } | undefined
      return [{ ...photo, artistId: String(row.artist_id), artistName: displayName(String(artist?.display_name ?? "")) }]
    })
  } catch {
    return []
  }
}
