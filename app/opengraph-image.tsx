import { SHARE_IMAGE_SIZE, SHARE_IMAGE_TYPE, shareImage } from "@/lib/og/share-image"
import { getRoundedListedCounts } from "@/lib/supabase/sitemap"

export const alt = "TattooMaps: find a tattoo artist near you"
export const size = SHARE_IMAGE_SIZE
export const contentType = SHARE_IMAGE_TYPE

// Live counts, refreshed hourly.
export const revalidate = 3600

export default async function OpengraphImage() {
  const counts = await getRoundedListedCounts()
  return shareImage({
    title: "Find a tattoo artist near you.",
    line: counts
      ? `${counts.shops} shops and ${counts.artists} artists across the U.S.`
      : "Tattoo shops and artists across the U.S.",
  })
}
