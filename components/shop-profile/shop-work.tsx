import Link from "next/link"
import { Plate } from "@/components/brand/plate"
import { ProfileSection } from "@/components/artist-profile/profile-sections"
import type { ShopWorkPhoto } from "@/lib/supabase/portfolio"

/**
 * "Work from our artists": the newest portfolio photos from the shop's artists
 * as framed plates, each linking to that artist's page. Renders nothing without photos.
 */
export function ShopWork({ photos }: { photos: ShopWorkPhoto[] }) {
  if (photos.length === 0) return null
  return (
    <ProfileSection id="shop-work" title="Work from our artists">
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {photos.map((photo) => (
          <li key={photo.id}>
            <Link
              href={`/artists/${photo.artistId}`}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plate
                src={photo.url}
                alt={photo.caption ? `${photo.caption}, by ${photo.artistName}` : `Tattoo by ${photo.artistName}`}
                name={photo.artistName}
                fluid
                sizes="(min-width: 768px) 270px, 45vw"
              />
              <span className="mt-1.5 block text-[13px] leading-[1.4] text-ink-muted text-pretty">
                {photo.caption ? `${photo.caption}, ` : ""}
                <span className="font-semibold text-ink">{photo.artistName}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </ProfileSection>
  )
}
