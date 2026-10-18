import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Map as MapIcon } from "lucide-react"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { FinderPlate } from "@/components/find-artist/finder-plate"
import { PRIMARY_BUTTON, SECONDARY_BUTTON, TEXT_LINK } from "@/components/find-artist/finder-ui"
import {
  finderHref,
  formatMiles,
  joinStyles,
  mapHref,
  resultsHref,
  toFinderSort,
  type FinderAnswers,
  type FinderSort,
} from "@/components/find-artist/finder-url"
import { FollowersLine } from "@/components/artists/artist-plate-card"
import { PrivateStudioLabel } from "@/components/brand/private-studio"
import {
  findArtistPages,
  lookupPlace,
  MAX_STYLES,
  nearestShops,
  shopsHref,
  stateName,
  styleCountsNear,
  toCoords,
  toRadius,
  WIDEN_RADII,
  type FinderArtist,
  type FinderPlace,
} from "@/lib/finder"
import { styleLabel, toStyleSlugs } from "@/lib/styles"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Artist finder results | TattooMaps",
  robots: { index: false, follow: true },
}

export const dynamic = "force-dynamic"

type SearchParams = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""

/**
 * The place from the URL. New links carry near/lat/lng; old ones
 * (?style=Fine%20Line&city=Austin&state=TX&size=…&budget=…) carry a city and
 * state or a ZIP, looked up the same way as step 1. Size and budget are ignored.
 */
async function placeFrom(sp: SearchParams): Promise<FinderPlace | null> {
  const coords = toCoords(one(sp.lat), one(sp.lng))
  if (coords) return { label: one(sp.near).trim().slice(0, 80) || "your location", ...coords }
  const zip = one(sp.zip).trim()
  const query = zip || [one(sp.city).trim(), one(sp.state).trim()].filter(Boolean).join(", ")
  return query ? lookupPlace(query) : null
}

const CHIP = "inline-flex min-h-9 items-center rounded border-1.5 border-ink bg-vellum tex-vellum px-3 text-sm font-medium"
const MAX_PAGES = 20

export default async function FinderResultsPage({ searchParams }: { searchParams: SearchParams }) {
  const place = await placeFrom(searchParams)
  if (!place) redirect("/find-artist")

  const styles = toStyleSlugs(one(searchParams.style).split(",").filter(Boolean)).slice(0, MAX_STYLES)
  const radius = toRadius(one(searchParams.r))
  const page = Math.min(Math.max(Math.floor(Number(one(searchParams.page))) || 1, 1), MAX_PAGES)
  const sort = toFinderSort(one(searchParams.sort))
  const answers: FinderAnswers = { near: place.label, lat: place.lat, lng: place.lng, r: radius, styles, sort }

  // Nothing at the chosen radius: retry at the larger ones until something turns up.
  let found = await findArtistPages({ lat: place.lat, lng: place.lng, radius, styles, pages: page, sort })
  let usedRadius = radius
  if (found.total === 0 && !found.error) {
    for (const wider of WIDEN_RADII.filter((r) => r > radius)) {
      usedRadius = wider
      found = await findArtistPages({ lat: place.lat, lng: place.lng, radius: wider, styles, pages: page, sort })
      if (found.total > 0 || found.error) break
    }
  }
  const { artists, total, error } = found
  const widened = usedRadius !== radius && total > 0

  // "Shops near you": only for a style search that didn't need widening.
  const showShops = styles.length > 0 && !widened && total > 0 && !error
  const [counts, shops] = showShops
    ? await Promise.all([
        styleCountsNear(place.lat, place.lng, radius).catch(() => ({}) as Record<string, number>),
        nearestShops(place.lat, place.lng, radius, 4),
      ])
    : [{} as Record<string, number>, []]
  const unlisted = counts.__none ?? 0

  const styleText = joinStyles(styles.map((s) => styleLabel(s) ?? s))
  const styleWord = styleText ? `${styleText} ` : ""
  const noun = (n: number) => (n === 1 ? "artist" : "artists")

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1 bg-paper tex-paper">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 pb-20 pt-10 sm:px-6 sm:pt-12">
          {error ? (
            <ErrorBox answers={answers} />
          ) : total === 0 ? (
            <EmptyState answers={answers} styleWord={styleWord} />
          ) : (
            <>
              <header className="flex flex-col gap-3">
                <span className="text-sm text-ink-muted">Artist finder</span>
                <h1 className="font-heading text-[32px] leading-[1.08] text-balance sm:text-[46px]">
                  <span className="tabular-nums">{total}</span> {styleWord}
                  {noun(total)} within {usedRadius} miles
                </h1>
                <span className="font-place text-[20px] italic">
                  {sort === "followers" ? "Most followed first" : "Nearest first"}, from {place.label}
                </span>
                {widened && (
                  <p className="border-1.5 border-l-[6px] border-ink border-l-navy bg-paper tex-paper px-4 py-3.5 text-[15px] leading-normal">
                    No {styleWord}artists listed within {radius} miles of {place.label}. We widened the search and found
                    the {total === 1 ? "nearest one" : `${total} nearest`}.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={CHIP}>{place.label}</span>
                  <span className={cn(CHIP, "tabular-nums")}>{widened ? `Up to ${usedRadius} mi` : `${radius} mi`}</span>
                  {styles.map((s) => (
                    <span key={s} className={CHIP}>
                      {styleLabel(s)}
                    </span>
                  ))}
                  <Link
                    href={finderHref(answers)}
                    className={cn("ml-1.5 inline-flex min-h-11 items-center text-[15px]", TEXT_LINK)}
                  >
                    Change answers
                  </Link>
                </div>
              </header>

              <section aria-label="Artists" className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-1.5 border-ink pb-3">
                  <span className="text-[15px] tabular-nums text-ink-muted">
                    Showing {artists.length} of {total}
                  </span>
                  <SortLinks answers={answers} sort={sort} />
                  <Link href={mapHref(answers)} className={cn(SECONDARY_BUTTON, "min-h-11")}>
                    <MapIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                    See on the map
                  </Link>
                </div>
                <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {artists.map((artist) => (
                    <li key={artist.id}>
                      <ArtistCard artist={artist} picked={styles} />
                    </li>
                  ))}
                </ul>
                {artists.length < total && page < MAX_PAGES && (
                  <div className="mt-2 flex justify-center">
                    <Link href={resultsHref(answers, page + 1)} scroll={false} className={SECONDARY_BUTTON}>
                      Show more artists
                    </Link>
                  </div>
                )}
              </section>

              {showShops && shops.length > 0 && (
                <section aria-labelledby="finder-shops-heading" className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1.5 border-b-1.5 border-ink pb-3">
                    <h2 id="finder-shops-heading" className="font-heading text-[30px] leading-[1.15]">
                      Shops near you
                    </h2>
                    <p className="text-[15px] leading-normal text-ink-muted">
                      {unlisted > 0 && `${unlisted} ${noun(unlisted)} near you haven't listed their styles yet. `}
                      These shops are close by and worth a look.
                    </p>
                  </div>
                  <ul className="grid md:grid-cols-2 md:gap-x-10">
                    {shops.map((shop) => (
                      <li key={shop.id}>
                        <Link
                          href={`/shops/${shop.id}`}
                          className="flex min-h-11 items-center justify-between gap-3 border-b border-rule py-3.5 text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="flex flex-col gap-0.5">
                            <span className="font-heading text-[19px] leading-[1.2]">{shop.name}</span>
                            {shop.reviewCount > 0 && (
                              <span className="text-[13px] tabular-nums text-ink-muted">
                                Rated {shop.rating.toFixed(1)} from {shop.reviewCount}{" "}
                                {shop.reviewCount === 1 ? "review" : "reviews"}
                              </span>
                            )}
                          </span>
                          <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
                            {formatMiles(shop.distance_mi)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={shopsHref(place.label)}
                    className={cn("inline-flex min-h-11 items-center self-start text-[15px]", TEXT_LINK)}
                  >
                    See all shops near {place.label.replace(/^Near\s+/i, "")}
                  </Link>
                </section>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 rounded border-1.5 border-ink bg-paper tex-paper p-6">
                <div className="flex flex-col gap-1">
                  <h2 className="font-heading text-[22px] leading-[1.2]">Found someone you like?</h2>
                  <p className="text-[15px] text-ink-muted">
                    Open their page and send a request. It goes straight to the artist or their shop.
                  </p>
                </div>
                <Link href="/artists" className={cn("inline-flex min-h-11 items-center text-[15px]", TEXT_LINK)}>
                  Browse all artists
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

/** One result: plate, name and distance, shop, place, up to three style tags (picked ones first). */
function ArtistCard({ artist, picked }: { artist: FinderArtist; picked: string[] }) {
  const tags = [
    ...artist.styles.filter((s) => picked.includes(s)),
    ...artist.styles.filter((s) => !picked.includes(s)),
  ].slice(0, 3)
  const { city, state } = artist.location
  return (
    <Link
      href={`/artists/${artist.id}`}
      className="flex h-full gap-4 rounded border-1.5 border-ink bg-vellum tex-vellum p-4 text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <FinderPlate src={artist.avatarUrl || artist.cardPhotoUrl || ""} name={artist.name} />
      <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <div className="flex items-baseline justify-between gap-2.5">
          <span className="min-w-0 break-words font-heading text-[22px] leading-[1.15]">{artist.name}</span>
          {/* Artists with no shop are measured to their city's center: "about 2 mi", whole miles, at least 1. */}
          <span className={cn("whitespace-nowrap text-sm font-semibold tabular-nums", artist.hasAreaLocation && "text-ink-muted")}>
            {artist.hasAreaLocation ? `about ${Math.max(1, Math.round(artist.distanceMi))} mi` : formatMiles(artist.distanceMi)}
          </span>
        </div>
        {artist.shopName ? (
          <span className="text-sm">at {artist.shopName}</span>
        ) : artist.isPrivateStudio ? (
          <PrivateStudioLabel className="text-sm" iconClassName="h-3.5 w-3.5" />
        ) : (
          artist.hasAreaLocation && <span className="text-sm text-ink-muted">Studio not listed</span>
        )}
        {city && (
          <span className="font-place text-[15px] italic text-ink-muted">
            {city}
            {state ? `, ${stateName(state)}` : ""}
          </span>
        )}
        <FollowersLine count={artist.instagramFollowers} />
        {tags.length > 0 && (
          <span className="mt-0.5 flex flex-wrap gap-[5px]">
            {tags.map((slug) => (
              <span
                key={slug}
                className={cn(
                  "inline-flex items-center rounded border-1.5 border-ink px-2 py-[3px] text-[13px] font-medium",
                  picked.includes(slug) ? "bg-ink text-cream" : "bg-vellum text-ink",
                )}
              >
                {styleLabel(slug)}
              </span>
            ))}
          </span>
        )}
      </div>
    </Link>
  )
}

const SORT_LINK =
  "inline-flex min-h-11 items-center rounded border-1.5 border-ink px-3.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

/** Sort: Nearest or Most followed, as links that keep every other answer. */
function SortLinks({ answers, sort }: { answers: FinderAnswers; sort: FinderSort }) {
  const options: { value: FinderSort; label: string }[] = [
    { value: "distance", label: "Nearest" },
    { value: "followers", label: "Most followed" },
  ]
  return (
    <div role="group" aria-label="Sort artists" className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm text-ink-muted" aria-hidden="true">
        Sort
      </span>
      {options.map((o) => (
        <Link
          key={o.value}
          href={resultsHref({ ...answers, sort: o.value })}
          scroll={false}
          aria-current={sort === o.value ? "true" : undefined}
          className={cn(
            SORT_LINK,
            sort === o.value ? "bg-ink text-cream" : "bg-vellum tex-vellum text-ink hover:bg-secondary",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  )
}

/** Nothing even at the widest radius. */
function EmptyState({ answers, styleWord }: { answers: FinderAnswers; styleWord: string }) {
  return (
    <section className="flex flex-col gap-5">
      <span className="text-sm text-ink-muted">Artist finder</span>
      <h1 className="font-heading text-[32px] leading-[1.08] text-balance sm:text-[46px]">
        No {styleWord}artists within {WIDEN_RADII[WIDEN_RADII.length - 1]} miles of {answers.near} yet.
      </h1>
      <div className="flex flex-wrap gap-2.5">
        {answers.styles.length > 0 ? (
          <>
            <Link href={finderHref(answers, "style")} className={SECONDARY_BUTTON}>
              Try another style
            </Link>
            <Link href={resultsHref({ ...answers, styles: [] })} className={PRIMARY_BUTTON}>
              Show every artist near me
            </Link>
          </>
        ) : (
          <Link href={finderHref(answers)} className={PRIMARY_BUTTON}>
            Try another place
          </Link>
        )}
      </div>
    </section>
  )
}

function ErrorBox({ answers }: { answers: FinderAnswers }) {
  return (
    <section className="flex flex-col gap-5">
      <span className="text-sm text-ink-muted">Artist finder</span>
      <h1 className="font-heading text-[32px] leading-[1.08] sm:text-[46px]">We couldn&apos;t load artists right now</h1>
      <p className="text-[17px] text-ink-muted">Please try again in a moment.</p>
      <div>
        <Link href={resultsHref(answers)} className={PRIMARY_BUTTON}>
          Try again
        </Link>
      </div>
    </section>
  )
}
