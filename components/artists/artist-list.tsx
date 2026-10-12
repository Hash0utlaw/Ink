import Link from "next/link"
import { StyleBadge } from "@/components/brand/style-badge"
import { STYLE_EDGE_COLOR } from "@/components/brand/style-symbol"
import { initials } from "@/lib/initials"
import { styleEntries } from "@/lib/styles"
import { allowedImageSrc } from "@/lib/utils/safe-image"
import { ArtistPlateCard, ArtistPlateGrid, ratingLine, type CardArtist } from "./artist-plate-card"

/** Has a photo next/image can load (stubs never do). */
export function hasPhoto(artist: CardArtist) {
  return !artist.isStub && allowedImageSrc(artist.avatarUrl) != null
}

/** Photos first, keeping the given order within each group. */
export function photosFirst<T extends CardArtist>(artists: T[]): T[] {
  return [...artists.filter(hasPhoto), ...artists.filter((a) => !hasPhoto(a))]
}

/**
 * An artist without a photo as a compact row: a 56px initials square with the
 * style-colored bottom edge, the name, and up to two style badges. Stubs aren't linked.
 */
export function ArtistRow({ artist, showShop = false, distance }: { artist: CardArtist; showShop?: boolean; distance?: number }) {
  const primary = artist.isStub ? null : artist.styles[0]
  const edge = (primary && STYLE_EDGE_COLOR[primary as keyof typeof STYLE_EDGE_COLOR]) || "hsl(var(--ink))"
  const badges = artist.isStub ? [] : styleEntries(artist.styles).slice(0, 2)
  const city = artist.location?.city ?? ""
  const meta = [
    showShop ? [artist.shopName, city].filter(Boolean).join(", ") : "",
    (artist.rating ?? 0) > 0 ? ratingLine(artist.rating ?? 0, artist.reviewCount ?? 0) : "",
    distance != null ? `${distance.toFixed(1)} mi away` : "",
  ].filter(Boolean)

  const body = (
    <>
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center border-1.5 border-ink bg-vellum font-heading text-[22px] leading-none text-ink"
        style={{ borderBottomWidth: 5, borderBottomColor: edge }}
        aria-hidden="true"
      >
        {initials(artist.name) || "?"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-[20px] leading-tight text-ink">{artist.name}</span>
        {meta.length > 0 && (
          <span className="mt-0.5 block text-[15px] tabular-nums text-ink-muted">{meta.join(". ")}</span>
        )}
        {badges.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {badges.map(({ slug, label }) => (
              <StyleBadge key={slug} slug={slug} label={label} />
            ))}
          </span>
        )}
      </span>
    </>
  )

  const row = "flex items-start gap-3 rounded border-1.5 border-transparent px-2 py-3"
  return (
    <li className="border-b border-rule">
      {artist.isStub ? (
        <div className={row}>{body}</div>
      ) : (
        <Link
          href={`/artists/${artist.id}`}
          className={`${row} hover:border-ink hover:bg-vellum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        >
          {body}
        </Link>
      )}
    </li>
  )
}

interface ArtistListProps {
  artists: CardArtist[]
  /** "{Shop}, {City}" on cards and rows (listings). */
  showShop?: boolean
  distancesById?: Record<string, number>
  /** Grid for the photo plates; defaults to 2 across, 4 from lg. */
  plateGridClassName?: string
  plateSizes?: string
}

/**
 * Artists with a photo as big plates, then those without as compact rows
 * (2 columns from lg), so lists never repeat an initials placeholder.
 */
export function ArtistList({ artists, showShop = false, distancesById, plateGridClassName, plateSizes }: ArtistListProps) {
  const withPhoto = artists.filter(hasPhoto)
  const withoutPhoto = artists.filter((a) => !hasPhoto(a))

  return (
    <div className="space-y-8">
      {withPhoto.length > 0 && (
        <ArtistPlateGrid className={plateGridClassName}>
          {withPhoto.map((artist) => (
            <li key={artist.id} className="min-w-0">
              <ArtistPlateCard artist={artist} showShop={showShop} distance={distancesById?.[artist.id]} sizes={plateSizes} />
            </li>
          ))}
        </ArtistPlateGrid>
      )}
      {withoutPhoto.length > 0 && (
        <ul className="grid border-t border-rule lg:grid-cols-2 lg:gap-x-10">
          {withoutPhoto.map((artist) => (
            <ArtistRow key={artist.id} artist={artist} showShop={showShop} distance={distancesById?.[artist.id]} />
          ))}
        </ul>
      )}
    </div>
  )
}
