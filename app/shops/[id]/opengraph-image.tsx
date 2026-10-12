import { SHARE_IMAGE_SIZE, SHARE_IMAGE_TYPE, shareImage } from "@/lib/og/share-image"
import { getShopById } from "@/lib/supabase/shops"

export const alt = "Tattoo shop on TattooMaps"
export const size = SHARE_IMAGE_SIZE
export const contentType = SHARE_IMAGE_TYPE

export default async function ShopShareImage({ params }: { params: { id: string } }) {
  const shop = await getShopById(params.id)
  if (!shop) return shareImage({ title: "Find a tattoo artist near you.", line: "Tattoo shops and artists across the U.S." })
  const loc = [shop.location.city, shop.location.state].filter(Boolean).join(", ")
  return shareImage({ title: shop.name, line: loc ? `Tattoo shop in ${loc}` : "Tattoo shop" })
}
