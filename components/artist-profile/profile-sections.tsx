import type { ReactNode } from "react"
import type { Artist } from "@/types/artist"
import type { Review } from "@/lib/supabase/reviews"
import Link from "next/link"
import type { PortfolioPhoto } from "@/lib/supabase/portfolio"
import { PortfolioGallery } from "./portfolio-gallery"

/** A profile section: Young Serif 30px heading, then its content. */
export function ProfileSection({
  id,
  title,
  count,
  children,
}: {
  id: string
  title: ReactNode
  /** Plain text beside the heading, e.g. "8 photos". */
  count?: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id}>
      <div className="flex flex-wrap items-baseline gap-x-2.5">
        <h2 id={id} className="font-heading text-[26px] leading-[1.15] text-ink lg:text-[30px]">
          {title}
        </h2>
        {count && <span className="text-sm tabular-nums text-ink-muted">{count}</span>}
      </div>
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

const TEXT_LINK = "font-semibold text-navy underline underline-offset-2 hover:no-underline"

/** Nothing uploaded yet: an honest empty state that turns into a claim prompt (unclaimed pages only). */
function NoPortfolio({ artist }: { artist: Artist }) {
  const claimed = artist.isClaimed || artist.hasAccount
  const claimHref = artist.handle ? `/claim?artist=${encodeURIComponent(artist.handle)}` : "/claim"
  return (
    <div className="flex flex-col gap-2 rounded border-1.5 border-ink bg-vellum tex-vellum p-5 lg:p-7">
      <p className="font-heading text-[22px] leading-[1.2] text-ink">No portfolio yet</p>
      <p className="text-[15px] leading-[1.5] text-ink-muted text-pretty">
        {claimed
          ? `${artist.name} hasn't added work to TattooMaps yet. Check back soon.`
          : `${artist.name} hasn't added work to TattooMaps yet. Ask the shop for recent work.`}
      </p>
      {!claimed && (
        <p className="mt-1.5 text-sm text-ink text-pretty">
          Are you {artist.name}?{" "}
          <Link href={claimHref} className={TEXT_LINK}>
            Claim this page
          </Link>{" "}
          to upload your portfolio.
        </p>
      )}
    </div>
  )
}

/** Portfolio, About and Reviews for an artist profile. */
export function ProfileSections({
  artist,
  portfolio,
  reviews,
}: {
  artist: Artist
  /** Active photos uploaded to TattooMaps, in the artist's order (lib/supabase/portfolio.ts). */
  portfolio: PortfolioPhoto[]
  reviews: Review[]
}) {
  const count = portfolio.length > 0 ? `${portfolio.length} ${portfolio.length === 1 ? "photo" : "photos"}` : undefined

  return (
    <div className="space-y-14">
      <ProfileSection id="portfolio" title="Portfolio" count={count}>
        {portfolio.length > 0 ? (
          <PortfolioGallery
            images={portfolio.map((p) => ({ src: p.url, caption: p.caption, id: p.id }))}
            name={artist.name}
            phoneLimit={6}
            pagePath={`/artists/${artist.id}`}
          />
        ) : (
          <NoPortfolio artist={artist} />
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
