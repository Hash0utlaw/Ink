import type { ReactNode } from "react"
import Link from "next/link"
import type { Artist } from "@/types/artist"
import { Plate } from "@/components/brand/plate"
import { StyleBadge } from "@/components/brand/style-badge"
import { styleEntries } from "@/lib/styles"
import { allowedImageSrc } from "@/lib/utils/safe-image"

/** What a card or row needs; the homepage and "Also at this shop" pass less than a full Artist. */
export type CardArtist = Pick<Artist, "id" | "name" | "avatarUrl" | "styles"> &
  Partial<Pick<Artist, "shopName" | "rating" | "reviewCount" | "isStub" | "location">>

interface ArtistPlateCardProps {
  artist: CardArtist
  /** "{Shop}, {City}" under the name (listings; off on the artist's own shop page). */
  showShop?: boolean
  distance?: number
  sizes?: string
}

/**
 * An artist as a plate: photo or initials, name, then shop and city, up to two
 * style badges and a rating line when there is one. Links to the profile;
 * stubs (shop_artists rows) have no profile, so they show the name only, unlinked.
 */
export function ArtistPlateCard({ artist, showShop = false, distance, sizes }: ArtistPlateCardProps) {
  const photo = artist.isStub ? null : allowedImageSrc(artist.avatarUrl)
  const styles = artist.isStub ? [] : styleEntries(artist.styles)
  const city = artist.location?.city ?? ""
  const rating = artist.rating ?? 0
  const reviewCount = artist.reviewCount ?? 0
  const extraLines = !artist.isStub && (showShop || distance != null || rating > 0)

  const body = (
    <>
      <Plate
        src={photo}
        alt={photo ? artist.name : `${artist.name} initials`}
        name={artist.name}
        primaryStyle={artist.isStub ? null : artist.styles[0]}
        fluid
        sizes={sizes ?? "(min-width: 1024px) 270px, 45vw"}
      />
      <span className="mt-3 block font-heading text-[19px] leading-tight text-ink text-balance lg:text-[21px]">
        {artist.name}
      </span>
      {extraLines && (
        <span className="mt-1 block text-[15px] leading-[1.4] text-ink-muted">
          {showShop && (artist.shopName || city) && (
            <span className="block">
              {artist.shopName}
              {artist.shopName && city && ", "}
              {city && <span className="font-place italic">{city}</span>}
            </span>
          )}
          {(rating > 0 || distance != null) && (
            <span className="block tabular-nums">
              {rating > 0 && ratingLine(rating, reviewCount)}
              {rating > 0 && distance != null && ", "}
              {distance != null && `${distance.toFixed(1)} mi away`}
            </span>
          )}
        </span>
      )}
      {styles.length > 0 && (
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          {styles.slice(0, 2).map(({ slug, label }) => (
            <StyleBadge key={slug} slug={slug} label={label} />
          ))}
          {styles.length > 2 && (
            <span className="text-sm font-semibold tabular-nums text-ink-muted">+{styles.length - 2}</span>
          )}
        </span>
      )}
    </>
  )

  if (artist.isStub) return <div className="p-2">{body}</div>
  return (
    <Link
      href={`/artists/${artist.id}`}
      className="block rounded-lg border-1.5 border-transparent p-2 hover:border-ink hover:bg-vellum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {body}
    </Link>
  )
}

/** "Rated 4.7 from 338 reviews". */
export function ratingLine(rating: number, reviewCount: number) {
  return `Rated ${rating.toFixed(1)}${reviewCount > 0 ? ` from ${reviewCount.toLocaleString("en-US")} ${reviewCount === 1 ? "review" : "reviews"}` : ""}`
}

/** A grid of artist plates: 2 across on mobile, 4 from lg (or `className`). */
export function ArtistPlateGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ul className={className ?? "grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6"}>{children}</ul>
  )
}

export function ArtistPlateSkeleton() {
  return (
    <li className="p-2" aria-hidden="true">
      <div className="aspect-[4/5] w-full border-1.5 border-rule bg-vellum" />
      <div className="mt-3 h-5 w-3/4 rounded bg-secondary" />
      <div className="mt-2 h-4 w-1/2 rounded bg-secondary" />
    </li>
  )
}
