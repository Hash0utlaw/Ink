import { Suspense } from "react"
import type { Metadata } from "next"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { ListingHeader } from "@/components/listings/listing-header"
import { SearchInterface } from "@/components/search/search-interface"
import { Skeleton } from "@/components/ui/skeleton"
import { getClaimedArtistCount } from "@/lib/supabase/claimed"

export const metadata: Metadata = {
  title: "Search Tattoo Artists & Shops | TattooMaps",
  description: "Search TattooMaps to find tattoo artists and studios by style, location, price range, and availability. Discover the perfect artist for your next tattoo.",
  alternates: { canonical: "/search" },
}

function SearchSkeleton() {
  return (
    <>
    {/* Server HTML keeps the h1; the client header adds the place and count. */}
    <ListingHeader title="Search results" />
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1">
        <Skeleton className="h-96 w-full rounded-lg bg-secondary" />
      </div>
      <div className="lg:col-span-3 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg bg-secondary" />
          ))}
        </div>
      </div>
    </div>
    </>
  )
}

// Picks up the claimed-artist count (cached for an hour) without a redeploy.
export const revalidate = 3600

export default async function SearchPage() {
  // Availability is a default until artists claim their pages.
  const showAvailableNow = (await getClaimedArtistCount()) > 0
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-[1344px] px-4 py-8 sm:px-6 lg:py-14">
          <Suspense fallback={<SearchSkeleton />}>
            <SearchInterface showAvailableNow={showAvailableNow} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  )
}
