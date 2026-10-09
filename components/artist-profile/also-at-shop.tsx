import Link from "next/link"
import { ArtistList } from "@/components/artists/artist-list"
import { ProfileSection } from "./profile-sections"

interface AlsoAtShopProps {
  shopId: string
  artists: { id: string; name: string; avatarUrl: string; styles: string[] }[]
  /** Active artists at the shop in all, this one included. */
  total: number
}

/** Up to four other artists at the same shop: photos as plates, then the rest as rows. */
export function AlsoAtShop({ shopId, artists, total }: AlsoAtShopProps) {
  if (artists.length === 0) return null
  return (
    <ProfileSection id="also-at-shop" title="Also at this shop">
      <ArtistList artists={artists} plateSizes="(min-width: 1024px) 270px, 45vw" />
      <p className="mt-4 text-[15px]">
        <Link href={`/shops/${shopId}`} className="font-semibold text-navy underline underline-offset-2 hover:no-underline">
          See all {total} artists at the shop
        </Link>
      </p>
    </ProfileSection>
  )
}
