import { Suspense } from "react"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { HeroSection } from "@/components/homepage/hero-section"
import { RecentlyViewed } from "@/components/homepage/recently-viewed"
import { BrowseByStyle } from "@/components/homepage/browse-by-style"
import { TopArtists } from "@/components/homepage/top-artists"
import { TopShops } from "@/components/homepage/top-shops"
import { LiveReviews, LiveReviewsSkeleton } from "@/components/homepage/live-reviews"
import { HowItWorks } from "@/components/homepage/how-it-works"
import { ClaimBand } from "@/components/homepage/claim-band"
import { getWorthTheDriveArtists } from "@/lib/supabase/artists"
import { getRecentReviews } from "@/lib/supabase/reviews"
import { getPlatformStats } from "@/lib/supabase/seo"
import { getStyleCounts, getTopRatedShops } from "@/lib/supabase/home"
import { SITE_URL } from "@/lib/site-config"

async function BrowseByStyleSection() {
  const counts = await getStyleCounts()
  return <BrowseByStyle counts={counts} />
}

async function TopArtistsSection() {
  // Same query as the former "Worth the Drive" row: top-rated, taking clients.
  const artists = await getWorthTheDriveArtists(6)
  return <TopArtists artists={artists} />
}

async function TopShopsSection({ shopCount }: { shopCount: number }) {
  const shops = await getTopRatedShops(4, 50)
  return <TopShops shops={shops} shopCount={shopCount} />
}

async function LiveReviewsSection() {
  const reviews = await getRecentReviews(8)
  return <LiveReviews initialReviews={reviews} />
}

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "TattooMaps",
  "url": SITE_URL,
  "description": "Discover tattoo artists and shops across all 50 states. Explore portfolios, book appointments, and find your perfect ink.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${SITE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
}

export default async function HomePage() {
  const stats = await getPlatformStats()

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex flex-1 flex-col gap-12 md:gap-20">
        <HeroSection stats={stats} />
        <RecentlyViewed />
        <Suspense fallback={null}>
          <BrowseByStyleSection />
        </Suspense>
        <Suspense fallback={null}>
          <TopArtistsSection />
        </Suspense>
        <Suspense fallback={null}>
          <TopShopsSection shopCount={stats.shopCount} />
        </Suspense>
        <Suspense fallback={<LiveReviewsSkeleton />}>
          <LiveReviewsSection />
        </Suspense>
        <HowItWorks />
        <ClaimBand />
      </main>
      <Footer />
    </div>
  )
}
