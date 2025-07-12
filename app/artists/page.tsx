import { Suspense } from "react"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ArtistSearchInterface } from "@/components/artists/artist-search-interface"

export default function ArtistsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Find Your Artist</h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Filter by style, location, and availability to discover the perfect artist for your vision.
            </p>
          </div>
          <ArtistSearchInterface />
        </div>
      </main>
      <Footer />
    </div>
  )
}
