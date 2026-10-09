import { Suspense } from "react"
import type { Metadata } from "next"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ListingHeader } from "@/components/listings/listing-header"
import { ArtistSearchInterface } from "@/components/artists/artist-search-interface"
import { getClaimedArtistCount } from "@/lib/supabase/claimed"

export const metadata: Metadata = {
  title: "Browse Tattoo Artists by Style & Location | TattooMaps",
  description: "Search thousands of tattoo artists by style, location, price, and availability. Find fine line, Japanese, realism, traditional, and more on TattooMaps.",
  alternates: { canonical: "/artists" },
}

// Picks up the claimed-artist count (cached for an hour) without a redeploy.
export const revalidate = 3600

export default async function ArtistsPage() {
  // Availability is a default until artists claim their pages.
  const showAvailableNow = (await getClaimedArtistCount()) > 0
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-[1344px] px-4 py-8 sm:px-6 lg:py-14">
          <Suspense
            fallback={
              // Server HTML keeps the h1; the client header adds the place and count.
              <>
                <ListingHeader title="Tattoo artists" />
                <div className="flex h-96 items-center justify-center text-ink-muted">Loading artists…</div>
              </>
            }
          >
            <ArtistSearchInterface showAvailableNow={showAvailableNow} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  )
}
