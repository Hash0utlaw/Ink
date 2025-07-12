import { Suspense } from "react"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Header } from "@/components/layout/header"
import { HeroSection } from "@/components/homepage/hero-section"
import { FeatureHighlights } from "@/components/homepage/feature-highlights"
import { PopularCategories } from "@/components/homepage/popular-categories"
import { FeaturedArtists } from "@/components/homepage/featured-artists"
import { Footer } from "@/components/layout/footer"

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
        <FeaturedArtists />
      </main>
      <Footer />
    </div>
  )
}
