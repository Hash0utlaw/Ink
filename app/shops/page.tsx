import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ShopSearchInterface } from "@/components/shops/shop-search-interface"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"

export default function ShopsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Find a Shop</h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Browse our curated list of top-rated tattoo shops from around the world.
            </p>
          </div>
          <ShopSearchInterface />
        </div>
      </main>
      <Footer />
    </div>
  )
}
