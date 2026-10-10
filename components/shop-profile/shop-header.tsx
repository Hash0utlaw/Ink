import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Globe, Phone } from "lucide-react"
import type { Shop } from "@/types/shop"
import { SaveButton } from "@/components/saved/save-button"
import { ShareButton } from "@/components/share/share-button"
import { StyleBadgeList } from "@/components/artist-profile/style-badge-list"
import { Plate } from "@/components/brand/plate"
import { ProfileCover } from "@/components/brand/profile-cover"
import { WhereToFindPanel, hasWhereToFind } from "@/components/brand/where-to-find"
import { formatMapAddress } from "@/lib/format-address"
import { allowedImageSrc } from "@/lib/utils/safe-image"
import { STATE_ABBR_TO_NAME } from "@/lib/utils/states"
import { cn } from "@/lib/utils"

const PRIMARY =
  "min-h-11 rounded-lg border-1.5 border-ink bg-flash-red px-5 text-[15px] font-semibold text-white hover:bg-flash-red/90"
const SECONDARY =
  "min-h-11 rounded-lg border-1.5 border-ink bg-vellum px-4 text-[15px] font-semibold text-ink hover:bg-secondary"
const TEXT_LINK = "font-semibold text-navy underline underline-offset-2 hover:no-underline"

export function directionsHref(shop: Shop) {
  const { lat, lng, address, city, state } = shop.location
  if (lat && lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  }
  const query = [address, city, state].filter(Boolean).join(", ")
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

interface ShopHeaderProps {
  shop: Shop
  initialSaved?: boolean
  /** The shop's uploaded cover image; no strip without one. */
  coverSrc?: string | null
  /** Active artists at the shop (artists.shop_id). */
  artistCount?: number
}

export function ShopHeader({ shop, initialSaved, coverSrc = null, artistCount = 0 }: ShopHeaderProps) {
  // Only the shop's own logo; scraped cover photos (Google, Street View) have expired and return 403.
  const photo = allowedImageSrc(shop.logoUrl)
  const stateName = STATE_ABBR_TO_NAME[shop.location.state] ?? shop.location.state
  const place = [shop.location.city, stateName].filter(Boolean).join(", ")
  const websiteUrl = shop.website?.trim()
  const claimHref = shop.slug ? `/claim?shop=${encodeURIComponent(shop.slug)}` : "/claim"
  const { lat, lng } = shop.location
  const coordinates: [number, number] | null = lat && lng ? [lng, lat] : null
  const address = formatMapAddress(shop.location.address, shop.location.city, shop.location.state, shop.location.zip)
  const showPanel = hasWhereToFind({ address, coordinates })

  return (
    <div className={cn(!coverSrc && "border-b border-rule bg-paper pb-10 pt-6")}>
      <ProfileCover src={coverSrc} alt={`${shop.name}'s cover image`} />
      <div className={cn("grid gap-8", showPanel ? "lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12" : "max-w-[720px]")}>
        <div className="min-w-0">
          <div className="flex items-start gap-4 lg:gap-6">
            {/* With a cover, the plate overlaps it by 24px (32px from lg), inset from its edge. */}
            <div
              className={cn("relative z-10 w-[112px] shrink-0 lg:w-[160px]", coverSrc && "-mt-6 ml-4 lg:-mt-8 lg:ml-6")}
            >
              <Plate
                src={photo}
                alt={photo ? `${shop.name}, tattoo shop` : `${shop.name} has no photo yet`}
                name={shop.name}
                primaryStyle={shop.styles[0]}
                fluid
                fallback="compass"
                sizes="(min-width: 1024px) 160px, 112px"
              />
            </div>

            <div className={cn("min-w-0", coverSrc && "pt-4")}>
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
              <Button className={PRIMARY} asChild>
                <a href={directionsHref(shop)} target="_blank" rel="noopener noreferrer">
                  Get directions
                </a>
              </Button>
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
                    className={`inline-flex items-center gap-1.5 ${TEXT_LINK}`}
                  >
                    <Globe className="h-4 w-4" aria-hidden="true" />
                    Website
                  </a>
                )}
                {shop.phone && (
                  <a href={`tel:${shop.phone}`} className={`inline-flex items-center gap-1.5 ${TEXT_LINK}`}>
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    Call {shop.phone}
                  </a>
                )}
              </div>
            )}

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
          <div className={cn(coverSrc && "lg:pt-6")}>
            <WhereToFindPanel
              coordinates={coordinates}
              address={address}
              mapLabel={`Map showing ${shop.name}${shop.location.city ? ` in ${shop.location.city}` : ""}`}
              artistCount={artistCount}
              rating={shop.rating}
              reviewCount={shop.reviewCount}
              hours={shop.hours}
            />
          </div>
        )}
      </div>
    </div>
  )
}
