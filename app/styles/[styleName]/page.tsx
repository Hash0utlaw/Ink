import { notFound } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { MapPin, User } from "lucide-react"
import { ALL_STYLES } from "@/app/styles/page"
import { StyleGallery } from "@/components/styles/style-gallery"
import { StyleCard } from "@/components/styles/style-card"
import { StyleHero } from "@/components/styles/style-hero"
import { ArtistList } from "@/components/artists/artist-list"
import { EmptyBox } from "@/components/artist-profile/profile-sections"
import { getArtists } from "@/lib/supabase/artists"
import { toStyleSlugs } from "@/lib/styles"
import { exactMasterSlug } from "@/lib/style-guide"

// Guide pages whose name isn't on the master style list (lib/styles.ts):
// Surrealism links to the closest master style; Biomechanical has none, so
// its artist links are hidden rather than showing unfiltered results.
const FILTER_OVERRIDES: Record<string, string | null> = { surrealism: "illustrative", biomechanical: null }

// Real artist counts and lists, refreshed hourly.
export const revalidate = 3600

// ─── Metadata ─────────────────────────────────────────────────────────────────

import { canonicalUrl } from "@/lib/seo"
export async function generateMetadata({ params }: { params: { styleName: string } }) {
  const style = ALL_STYLES.find((s) => s.slug === params.styleName)
  if (!style) return {}
  return {
    title: `${style.name} Tattoos — Artists & Inspiration | TattooMaps`,
    description: `${style.description} Browse ${style.name.toLowerCase()} tattoo artists and shops on TattooMaps.`,
    alternates: { canonical: canonicalUrl(`/styles/${style.slug}`) },
  }
}

export async function generateStaticParams() {
  return ALL_STYLES.map((s) => ({ styleName: s.slug }))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ARTIST_LIMIT = 24
const PRIMARY =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-1.5 border-ink bg-flash-red px-5 text-[15px] font-semibold text-white hover:bg-flash-red/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const SECONDARY =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-1.5 border-ink bg-vellum tex-vellum px-5 text-[15px] font-semibold text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const TEXT_LINK = "font-semibold text-navy underline underline-offset-2 hover:no-underline"
const SECTION_HEADING = "font-heading text-[26px] leading-[1.15] text-ink text-balance lg:text-[30px]"

export default async function StylePage({ params }: { params: { styleName: string } }) {
  const style = ALL_STYLES.find((s) => s.slug === params.styleName)
  if (!style) notFound()

  const filterSlug =
    style.slug in FILTER_OVERRIDES ? FILTER_OVERRIDES[style.slug] : toStyleSlugs([style.name])[0] ?? null
  const artistsHref = filterSlug ? `/artists?styles=${filterSlug}` : null
  const shopsHref = `/shops?styles=${encodeURIComponent(filterSlug ?? style.name)}`

  // Artists only for guide styles that are exactly a master style; none for close matches.
  const masterSlug = exactMasterSlug(style.slug)
  const artists = masterSlug ? await getArtists({ styles: [masterSlug], sortBy: "rating", pageSize: ARTIST_LIMIT }) : null

  const related = ALL_STYLES.filter(
    (s) => s.slug !== style.slug && s.category === style.category
  ).slice(0, 3)

  return (
    <div className="flex min-h-screen flex-col bg-paper tex-paper">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1">
        <StyleHero style={style} masterSlug={masterSlug} />

        <div className="mx-auto max-w-[1180px] space-y-14 px-4 py-10 sm:px-6 lg:space-y-20 lg:py-14">
          {masterSlug && artists && !artists.error && (
            <section aria-labelledby="style-artists">
              <h2 id="style-artists" className={SECTION_HEADING}>
                {style.name} artists
              </h2>
              <div className="mt-5">
                {artists.data.length > 0 ? (
                  <>
                    <ArtistList artists={artists.data} showShop />
                    <p className="mt-6 text-[15px]">
                      <Link href={`/artists?styles=${masterSlug}`} className={TEXT_LINK}>
                        See all {style.name} artists
                      </Link>
                    </p>
                  </>
                ) : (
                  <EmptyBox title={`No ${style.name} artists listed yet`}>
                    Browse all artists, or check back as more artists join.
                  </EmptyBox>
                )}
              </div>
            </section>
          )}

          <section aria-labelledby="style-about">
            <h2 id="style-about" className={SECTION_HEADING}>
              About {style.name}
            </h2>
            <p className="mt-3 max-w-prose text-base leading-[1.55] text-ink text-pretty">{style.description}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {style.tags.map((tag) => (
                <li key={tag} className="rounded-lg border-1.5 border-ink bg-vellum tex-vellum px-2.5 py-1 text-sm text-ink">
                  {tag}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="style-examples">
            <h2 id="style-examples" className={SECTION_HEADING}>
              {style.name} examples
            </h2>
            <div className="mt-5">
              <StyleGallery images={style.exampleImages} styleName={style.name} />
            </div>
            <p className="mt-3 text-[13px] text-ink-muted">Example images, not work by listed artists.</p>
          </section>

          <section aria-labelledby="style-find" className="rounded-lg border-1.5 border-ink bg-vellum tex-vellum p-6 lg:p-8">
            <h2 id="style-find" className="font-heading text-[22px] leading-[1.15] text-ink lg:text-[26px]">
              Ready to get your {style.name} tattoo?
            </h2>
            <p className="mt-2 max-w-prose text-[15px] leading-[1.55] text-ink-muted text-pretty">
              {artistsHref
                ? `Find artists and shops that specialise in ${style.name.toLowerCase()} work, then view portfolios and book a consultation.`
                : `Browse tattoo shops that specialise in ${style.name.toLowerCase()} work and see shop portfolios.`}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {/* One red button: Find an artist, or Find a shop when there's no artist filter. */}
              {artistsHref && (
                <Link href={artistsHref} className={PRIMARY}>
                  <User className="h-4 w-4" aria-hidden="true" />
                  Find an artist
                </Link>
              )}
              <Link href={shopsHref} className={artistsHref ? SECONDARY : PRIMARY}>
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Find a shop
              </Link>
            </div>
          </section>

          {related.length > 0 && (
            <section aria-labelledby="style-related">
              <h2 id="style-related" className={SECTION_HEADING}>
                Related styles
              </h2>
              <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                {related.map((s) => (
                  <li key={s.slug}>
                    <StyleCard style={s} masterSlug={exactMasterSlug(s.slug)} artistCount={null} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
