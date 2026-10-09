import { Suspense } from "react"
import type { Metadata } from "next"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ListingHeader } from "@/components/listings/listing-header"
import { ShopSearchInterface } from "@/components/shops/shop-search-interface"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"

export const metadata: Metadata = {
  title: "Find Tattoo Shops Near You | TattooMaps",
  description: "Browse top-rated tattoo studios across the US. Compare artist portfolios, read reviews, check walk-in availability, and book your appointment on TattooMaps.",
  alternates: { canonical: "/shops" },
}

export default function ShopsPage() {
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
                <ListingHeader title="Tattoo shops" />
                <div className="flex h-96 items-center justify-center text-ink-muted">Loading shops…</div>
              </>
            }
          >
            <ShopSearchInterface />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  )
}
