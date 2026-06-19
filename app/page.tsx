import { Suspense } from "react"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Header } from "@/components/layout/header"
import { HeroSection } from "@/components/homepage/hero-section"
import { FeatureHighlights } from "@/components/homepage/feature-highlights"
import { PopularCategories } from "@/components/homepage/popular-categories"
import { FeaturedArtists, FeaturedArtistsSkeleton } from "@/components/homepage/featured-artists"
import { NewestFlash, NewestFlashSkeleton } from "@/components/homepage/newest-flash"
import { WorthTheDrive, WorthTheDriveSkeleton } from "@/components/homepage/worth-the-drive"
import { LiveReviews, LiveReviewsSkeleton } from "@/components/homepage/live-reviews"
import { Footer } from "@/components/layout/footer"
import { getArtists, getWorthTheDriveArtists } from "@/lib/supabase/artists"
import { getNewestFlash } from "@/lib/supabase/flash"
import { getRecentReviews } from "@/lib/supabase/reviews"

async function FeaturedArtistsSection() {
  const { data: artists } = await getArtists()
  return <FeaturedArtists artists={artists} />
}

async function NewestFlashSection() {
  const listings = await getNewestFlash(6)
  return <NewestFlash listings={listings} />
}

async function WorthTheDriveSection() {
  const artists = await getWorthTheDriveArtists(6)
  return <WorthTheDrive artists={artists} />
}

async function LiveReviewsSection() {
  const reviews = await getRecentReviews(8)
  return <LiveReviews initialReviews={reviews} />
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1">
        <HeroSection />
        <FeatureHighlights />
        <PopularCategories />
        <Suspense fallback={<FeaturedArtistsSkeleton />}>
          <FeaturedArtistsSection />
        </Suspense>
        <Suspense fallback={<NewestFlashSkeleton />}>
          <NewestFlashSection />
        </Suspense>
        <Suspense fallback={<WorthTheDriveSkeleton />}>
          <WorthTheDriveSection />
        </Suspense>
        <Suspense fallback={<LiveReviewsSkeleton />}>
          <LiveReviewsSection />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
