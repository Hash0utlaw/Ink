import type { ReactNode } from "react"
import Link from "next/link"
import { Globe, Phone } from "lucide-react"
import type { Shop } from "@/types/shop"
import { SaveButton } from "@/components/saved/save-button"
import { ShareButton } from "@/components/share/share-button"
import { StyleBadgeList } from "@/components/artist-profile/style-badge-list"
import { Plate } from "@/components/brand/plate"
import { WhereToFindPanel, hasWhereToFind } from "@/components/brand/where-to-find"
import { FollowList } from "@/components/brand/follow-list"
import { formatMapAddress } from "@/lib/format-address"
import { shopSocialLinks, workingWebsite } from "@/lib/socials"
import { allowedImageSrc } from "@/lib/utils/safe-image"
import { STATE_ABBR_TO_NAME } from "@/lib/utils/states"
import { cn } from "@/lib/utils"

const SECONDARY =
  "min-h-11 rounded border-1.5 border-ink bg-vellum tex-vellum px-4 text-[15px] font-semibold text-ink hover:bg-secondary"
const TEXT_LINK = "font-semibold text-navy underline underline-offset-2 hover:no-underline"

interface ShopHeaderProps {
  shop: Shop
  initialSaved?: boolean
  /** Breadcrumb nav, shown small above the name. */
  breadcrumb?: ReactNode
  /** Active artists at the shop (artists.shop_id). */
  artistCount?: number
}

export function ShopHeader({ shop, initialSaved, breadcrumb, artistCount = 0 }: ShopHeaderProps) {
  // Only the shop's own logo; scraped cover photos (Google, Street View) have expired and return 403.
  const photo = allowedImageSrc(shop.logoUrl)
  const stateName = STATE_ABBR_TO_NAME[shop.location.state] ?? shop.location.state
  const place = [shop.location.city, stateName].filter(Boolean).join(", ")
  const websiteUrl = workingWebsite(shop)
  const claimHref = shop.slug ? `/claim?shop=${encodeURIComponent(shop.slug)}` : "/claim"
  const { lat, lng } = shop.location
  const coordinates: [number, number] | null = lat && lng ? [lng, lat] : null
  const address = formatMapAddress(shop.location.address, shop.location.city, shop.location.state, shop.location.zip)
  const showPanel = hasWhereToFind({ address, coordinates })
  const follow = shopSocialLinks(shop)

  return (
    // Sits right under the page's full-bleed ProfileCover; the plate and panel overlap it.
    <div>
      <div className={cn("grid gap-8", showPanel ? "lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12" : "max-w-[720px]")}>
        <div className="min-w-0">
          <div className="flex items-start gap-4 lg:gap-6">
            {/* The plate overlaps the cover by 56px (104px from lg), inset from its edge, above it. */}
            <div className="relative z-10 -mt-14 ml-4 w-[112px] shrink-0 lg:-mt-[104px] lg:ml-6 lg:w-[168px]">
              <Plate
                src={photo}
                alt={photo ? `${shop.name}, tattoo shop` : `${shop.name} has no photo yet`}
                name={shop.name}
                primaryStyle={shop.styles[0]}
                fluid
                sizes="(min-width: 1024px) 168px, 112px"
              />
            </div>

            <div className="min-w-0 pt-4">
              {breadcrumb}
              <h1 className="font-heading text-[30px] leading-[1.05] text-ink text-balance lg:text-[44px]">
                {shop.name}
              </h1>
              {place && <p className="mt-2 font-place text-[17px] italic text-ink-muted lg:text-[19px]">{place}</p>}
              {shop.rating > 0 && (
                <p className="mt-2 text-[15px] tabular-nums text-ink-muted">
                  Rated {shop.rating.toFixed(1)}
                  {shop.reviewCount > 0 &&
                    ` from ${shop.reviewCount.toLocaleString("en-US")} ${shop.reviewCount === 1 ? "review" : "reviews"}`}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 min-w-0 space-y-5">
            {shop.styles.length > 0 && <StyleBadgeList styles={shop.styles} max={4} />}

            <div className="flex flex-wrap gap-2">
              <SaveButton
                itemType="shop"
                itemId={shop.id}
                variant="full"
                initialSaved={initialSaved}
                className={SECONDARY}
              />
              <ShareButton
                name={shop.name}
                title={`${shop.name}, tattoo shop${shop.location.city ? ` in ${shop.location.city}` : ""}`}
                className={`${SECONDARY} w-11 px-0`}
              />
            </div>

            {(websiteUrl || shop.phone) && (
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
                {websiteUrl && (
                  <a
                    href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex min-h-11 items-center gap-1.5 ${TEXT_LINK}`}
                  >
                    <Globe className="h-4 w-4" aria-hidden="true" />
                    Website
                  </a>
                )}
                {shop.phone && (
                  <a href={`tel:${shop.phone}`} className={`inline-flex min-h-11 items-center gap-1.5 ${TEXT_LINK}`}>
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    Call {shop.phone}
                  </a>
                )}
              </div>
            )}

            {!showPanel && <FollowList links={follow} className="max-w-[360px]" />}

            {!shop.isClaimed && (
              <p className="max-w-prose text-[15px] leading-[1.55] text-ink-muted text-pretty">
                {shop.name}&apos;s details come from public listings. If you own this shop,{" "}
                <Link href={claimHref} className={TEXT_LINK}>
                  claim this page
                </Link>{" "}
                to add your team and keep the details current.
              </p>
            )}
          </div>
        </div>

        {showPanel && (
          <div className="relative z-10 lg:-mt-[104px]">
            <WhereToFindPanel
              coordinates={coordinates}
              address={address}
              mapLabel={`Map showing ${shop.name}${shop.location.city ? ` in ${shop.location.city}` : ""}`}
              artistCount={artistCount}
              rating={shop.rating}
              reviewCount={shop.reviewCount}
              hours={shop.hours}
              follow={follow}
            />
          </div>
        )}
      </div>
    </div>
  )
}
