import { Suspense } from "react"
import type { Metadata } from "next"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ShopSearchInterface } from "@/components/shops/shop-search-interface"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { FinderCta } from "@/components/layout/finder-cta"

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
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Find a Shop</h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Browse our curated list of top-rated tattoo shops from around the world.
            </p>
          </div>
          <div className="max-w-2xl mx-auto mb-10">
            <FinderCta />
          </div>
          <Suspense fallback={<div className="h-96 flex items-center justify-center text-muted-foreground">Loading shops…</div>}>
            <ShopSearchInterface />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  )
}
