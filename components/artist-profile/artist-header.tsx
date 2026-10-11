import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Instagram, Globe, BadgeCheck } from "lucide-react"
import type { Artist } from "@/types/artist"
import { SaveButton } from "@/components/saved/save-button"
import { ShareButton } from "@/components/share/share-button"
import { RequestIntroButton } from "./request-intro-button"
import { StyleBadgeList } from "./style-badge-list"
import { Plate } from "@/components/brand/plate"
import { ProfileCover } from "@/components/brand/profile-cover"
import { WhereToFindPanel, hasWhereToFind } from "@/components/brand/where-to-find"
import type { ArtistShop } from "@/lib/supabase/artists"
import { formatMapAddress } from "@/lib/format-address"
import { allowedImageSrc } from "@/lib/utils/safe-image"
import { STATE_ABBR_TO_NAME } from "@/lib/utils/states"
import { cn } from "@/lib/utils"

const SECONDARY =
  "min-h-11 rounded-lg border-1.5 border-ink bg-vellum tex-vellum px-4 text-[15px] font-semibold text-ink hover:bg-secondary"
// Same as "Get directions" in the Where to find panel.
const OUTLINE =
  "inline-flex min-h-11 items-center justify-center rounded-lg border-1.5 border-ink px-4 text-[15px] font-semibold text-ink hover:bg-vellum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const TEXT_LINK = "font-semibold text-navy underline underline-offset-2 hover:no-underline"

interface ArtistHeaderProps {
  artist: Artist
  initialSaved?: boolean
  /** The artist's shop page, when the shop is active. */
  shopHref?: string | null
  /** The artist's uploaded cover image; the default night strip without one. */
  coverSrc?: string | null
  /** The artist's active shop, for the "Where to find" panel. */
  shop?: ArtistShop | null
}

export function ArtistHeader({ artist, initialSaved, shopHref, coverSrc = null, shop = null }: ArtistHeaderProps) {
  const igHandle = artist.instagramHandle?.replace(/^@/, "").trim()
  const websiteUrl = artist.websiteUrl?.trim()
  const showVerified = artist.hasAccount && artist.isVerified
  // Availability defaults to on for every listing; it's only real once claimed.
  const showAvailable = artist.isClaimed && artist.isAvailable
  const photo = allowedImageSrc(artist.avatarUrl)
  const stateName = STATE_ABBR_TO_NAME[artist.location.state] ?? artist.location.state
  const place = [artist.location.city, stateName].filter(Boolean).join(", ")
  const claimHref = artist.handle ? `/claim?artist=${encodeURIComponent(artist.handle)}` : "/claim"
  const shopAddress = shop ? formatMapAddress(shop.address, shop.city, shop.state, shop.zip) : ""
  const showPanel = !!shop && hasWhereToFind({ address: shopAddress, coordinates: shop.coordinates })

  return (
    <div>
      <ProfileCover src={coverSrc} alt={`${artist.name}'s cover image`} />
      <div className={cn("grid gap-8", showPanel ? "lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12" : "max-w-[720px]")}>
        <div className="min-w-0">
          <div className="flex items-start gap-4 lg:gap-6">
            {/* The plate overlaps the cover by 56px (104px from lg), inset from its edge, above it. */}
            <div className="relative z-10 -mt-14 ml-4 w-[112px] shrink-0 lg:-mt-[104px] lg:ml-6 lg:w-[168px]">
              <Plate
                src={photo}
                alt={photo ? `${artist.name}, tattoo artist` : `${artist.name} has no photo yet`}
                name={artist.name}
                primaryStyle={artist.styles[0]}
                fluid
                sizes="(min-width: 1024px) 168px, 112px"
              />
            </div>

            <div className="min-w-0 pt-4">
              <h1 className="font-heading text-[30px] leading-[1.05] text-ink text-balance lg:text-[44px]">
                {artist.name}
              </h1>
              {artist.shopName && (
                <p className="mt-2 text-base text-ink lg:text-[19px]">
                  Tattoo artist at{" "}
                  {shopHref ? (
                    <Link href={shopHref} className={TEXT_LINK}>
                      {artist.shopName}
                    </Link>
                  ) : (
                    artist.shopName
                  )}
                </p>
              )}
              {place && <p className="mt-1 font-place text-[17px] italic text-ink-muted lg:text-[19px]">{place}</p>}
              {(artist.rating > 0 || showVerified || showAvailable) && (
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-ink-muted">
                  {artist.rating > 0 && (
                    <span className="tabular-nums">
                      Rated {artist.rating.toFixed(1)}
                      {artist.reviewCount > 0 &&
                        ` from ${artist.reviewCount} ${artist.reviewCount === 1 ? "review" : "reviews"}`}
                    </span>
                  )}
                  {showVerified && (
                    <span className="inline-flex items-center gap-1 font-semibold text-ink">
                      <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                      Verified
                    </span>
                  )}
                  {showAvailable && <span className="font-semibold text-bottle-green">Available for booking</span>}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 min-w-0 space-y-5">
            {artist.styles.length > 0 && <StyleBadgeList styles={artist.styles} max={4} />}

            <div className="flex flex-wrap gap-2">
              {artist.isClaimed ? (
                // Outline, so "Send request" stays the page's one red button.
                <Button variant="ghost" className={OUTLINE} asChild>
                  <Link href={`/book/${artist.handle || artist.id}`}>Book now</Link>
                </Button>
              ) : (
                <RequestIntroButton className={OUTLINE}>Request an intro</RequestIntroButton>
              )}
              <SaveButton
                itemType="artist"
                itemId={artist.id}
                variant="full"
                initialSaved={initialSaved}
                className={SECONDARY}
              />
              <ShareButton
                name={artist.name}
                title={`${artist.name}, tattoo artist${artist.location.city ? ` in ${artist.location.city}` : ""}`}
                className={`${SECONDARY} w-11 px-0`}
              />
            </div>

            {(igHandle || websiteUrl) && (
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
                {igHandle && (
                  <a
                    href={`https://instagram.com/${igHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 ${TEXT_LINK}`}
                  >
                    <Instagram className="h-4 w-4" aria-hidden="true" />@{igHandle}
                  </a>
                )}
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
              </div>
            )}

            {!artist.hasAccount && (
              <p className="max-w-prose text-[15px] leading-[1.55] text-ink-muted text-pretty">
                {artist.name}&apos;s details come from public listings. If this is you,{" "}
                <Link href={claimHref} className={TEXT_LINK}>
                  claim this page
                </Link>{" "}
                to add your work and answer requests yourself.
              </p>
            )}
          </div>
        </div>

        {showPanel && shop && (
          <div className="relative z-10 lg:-mt-[104px]">
            <WhereToFindPanel
              coordinates={shop.coordinates}
              address={shopAddress}
              mapLabel={`Map showing ${shop.name}${shop.city ? ` in ${shop.city}` : ""}`}
              shop={{ name: shop.name, href: `/shops/${shop.id}` }}
              place={place}
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
