import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Instagram, Globe, BadgeCheck } from "lucide-react"
import type { Artist } from "@/types/artist"
import { SaveButton } from "@/components/saved/save-button"
import { ShareButton } from "@/components/share/share-button"
import { RequestIntroButton } from "./request-intro-button"
import { StyleBadgeList } from "./style-badge-list"
import { Plate } from "@/components/brand/plate"
import { allowedImageSrc } from "@/lib/utils/safe-image"
import { STATE_ABBR_TO_NAME } from "@/lib/utils/states"

const PRIMARY =
  "min-h-11 rounded-lg border-1.5 border-ink bg-flash-red px-5 text-[15px] font-semibold text-white hover:bg-flash-red/90"
const SECONDARY =
  "min-h-11 rounded-lg border-1.5 border-ink bg-vellum px-4 text-[15px] font-semibold text-ink hover:bg-secondary"
const TEXT_LINK = "font-semibold text-navy underline underline-offset-2 hover:no-underline"

interface ArtistHeaderProps {
  artist: Artist
  initialSaved?: boolean
  /** The artist's shop page, when the shop is active. */
  shopHref?: string | null
}

export function ArtistHeader({ artist, initialSaved, shopHref }: ArtistHeaderProps) {
  const igHandle = artist.instagramHandle?.replace(/^@/, "").trim()
  const websiteUrl = artist.websiteUrl?.trim()
  const showVerified = artist.hasAccount && artist.isVerified
  // Availability defaults to on for every listing; it's only real once claimed.
  const showAvailable = artist.isClaimed && artist.isAvailable
  const photo = allowedImageSrc(artist.avatarUrl)
  const stateName = STATE_ABBR_TO_NAME[artist.location.state] ?? artist.location.state
  const place = [artist.location.city, stateName].filter(Boolean).join(", ")
  const claimHref = artist.handle ? `/claim?artist=${encodeURIComponent(artist.handle)}` : "/claim"

  return (
    <div className="grid grid-cols-[128px_minmax(0,1fr)] items-start gap-x-4 gap-y-5 lg:grid-cols-[332px_minmax(0,1fr)] lg:gap-x-12">
      {/* From lg the plate overlaps the cover strip above by 48px, inset from its frame. */}
      <div className="relative z-10 lg:row-span-2 lg:-mt-12 lg:pl-8">
        <Plate
          src={photo}
          alt={photo ? `${artist.name}, tattoo artist` : `${artist.name} has no photo yet`}
          name={artist.name}
          primaryStyle={artist.styles[0]}
          fluid
          fallback="compass"
          sizes="(min-width: 1024px) 300px, 128px"
        />
      </div>

      <div className="min-w-0 lg:pt-6">
        <h1 className="font-heading text-[32px] leading-[1.05] text-ink text-balance lg:text-[56px]">{artist.name}</h1>
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

      <div className="col-span-2 min-w-0 space-y-5 lg:col-span-1 lg:col-start-2">
        {artist.styles.length > 0 && <StyleBadgeList styles={artist.styles} max={4} />}

        <div className="flex flex-wrap gap-2">
          {artist.isClaimed ? (
            <Button className={PRIMARY} asChild>
              <Link href={`/book/${artist.handle || artist.id}`}>Book now</Link>
            </Button>
          ) : (
            <Button className={PRIMARY} asChild>
              <RequestIntroButton>Request an intro</RequestIntroButton>
            </Button>
          )}
          <SaveButton itemType="artist" itemId={artist.id} variant="full" initialSaved={initialSaved} className={SECONDARY} />
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
  )
}
