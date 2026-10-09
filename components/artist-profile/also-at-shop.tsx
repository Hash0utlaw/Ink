import Link from "next/link"
import { Plate } from "@/components/brand/plate"
import { StyleBadge } from "@/components/brand/style-badge"
import { styleEntries } from "@/lib/styles"
import { allowedImageSrc } from "@/lib/utils/safe-image"
import { ProfileSection } from "./profile-sections"

interface AlsoAtShopProps {
  shopId: string
  artists: { id: string; name: string; avatarUrl: string; styles: string[] }[]
  /** Active artists at the shop in all, this one included. */
  total: number
}

/** Up to four other artists at the same shop, each linking to their profile. */
export function AlsoAtShop({ shopId, artists, total }: AlsoAtShopProps) {
  if (artists.length === 0) return null
  return (
    <ProfileSection id="also-at-shop" title="Also at this shop">
      <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {artists.map((a) => {
          const photo = allowedImageSrc(a.avatarUrl)
          return (
            <li key={a.id}>
              <Link
                href={`/artists/${a.id}`}
                className="flex items-center gap-4 rounded-lg border-1.5 border-transparent p-2 hover:border-ink hover:bg-vellum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plate
                  src={photo}
                  alt={photo ? a.name : `${a.name} initials`}
                  name={a.name}
                  primaryStyle={a.styles[0]}
                  size={72}
                />
                <span className="min-w-0">
                  <span className="block font-heading text-[21px] leading-tight text-ink">{a.name}</span>
                  {a.styles.length > 0 && (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {styleEntries(a.styles)
                        .slice(0, 2)
                        .map(({ slug, label }) => (
                          <StyleBadge key={slug} slug={slug} label={label} />
                        ))}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-[15px]">
        <Link href={`/shops/${shopId}`} className="font-semibold text-navy underline underline-offset-2 hover:no-underline">
          See all {total} artists at the shop
        </Link>
      </p>
    </ProfileSection>
  )
}
