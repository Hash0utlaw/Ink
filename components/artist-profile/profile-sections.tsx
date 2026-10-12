import type { ReactNode } from "react"
import type { Artist } from "@/types/artist"
import type { Review } from "@/lib/supabase/reviews"
import { allowedImageSrc } from "@/lib/utils/safe-image"
import { PortfolioGallery } from "./portfolio-gallery"

/** A profile section: Young Serif 30px heading, then its content. */
export function ProfileSection({ id, title, children }: { id: string; title: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="font-heading text-[26px] leading-[1.15] text-ink lg:text-[30px]">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** The design's empty state: one vellum box, a bold first line and one helpful sentence. */
export function EmptyBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded border-1.5 border-ink bg-vellum tex-vellum p-5">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-[15px] leading-[1.55] text-ink-muted text-pretty">{children}</p>
    </div>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

/** Portfolio, About and Reviews for an artist profile. */
export function ProfileSections({ artist, reviews }: { artist: Artist; reviews: Review[] }) {
  // Only photos next/image can load; no placeholders.
  const photos = Array.from(new Set([...artist.portfolioImages, ...artist.previewImages]))
    .map((url) => allowedImageSrc(url))
    .filter((url): url is string => !!url)

  return (
    <div className="space-y-14">
      <ProfileSection id="portfolio" title="Portfolio">
        {photos.length > 0 ? (
          <PortfolioGallery images={photos} name={artist.name} />
        ) : (
          <EmptyBox title="No photos yet">
            Ask the shop for recent work, or check back after {artist.name} claims this page.
          </EmptyBox>
        )}
      </ProfileSection>

      <ProfileSection id="about" title={`About ${artist.name}`}>
        {artist.bio ? (
          <p className="max-w-prose whitespace-pre-line text-base leading-[1.55] text-ink text-pretty">{artist.bio}</p>
        ) : (
          <EmptyBox title="No bio yet">{artist.name} hasn&apos;t written about their work here yet.</EmptyBox>
        )}
      </ProfileSection>

      <ProfileSection id="reviews" title="Reviews">
        <ReviewList reviews={reviews} hasListingRating={artist.reviewCount > 0} />
      </ProfileSection>
    </div>
  )
}

/** TattooMaps reviews as rule-divided rows, or the empty state. */
export function ReviewList({ reviews, hasListingRating }: { reviews: Review[]; hasListingRating: boolean }) {
  if (reviews.length === 0) {
    // The header's rating comes from public listings; say these are TattooMaps reviews.
    return (
      <EmptyBox title={hasListingRating ? "No TattooMaps reviews yet" : "No reviews yet"}>
        Reviews appear here after clients book through TattooMaps.
      </EmptyBox>
    )
  }
  return (
    <ul className="border-t border-rule">
      {reviews.map((review) => (
        <li key={review.id} className="border-b border-rule py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-semibold text-ink">{review.clientName}</p>
            <p className="text-[15px] tabular-nums text-ink-muted">
              Rated {review.rating} of 5
              {formatDate(review.createdAt) && `, ${formatDate(review.createdAt)}`}
            </p>
          </div>
          {review.reviewText && (
            <p className="mt-2 max-w-prose text-base leading-[1.55] text-ink text-pretty">{review.reviewText}</p>
          )}
        </li>
      ))}
    </ul>
  )
}
