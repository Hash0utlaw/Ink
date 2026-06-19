import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { SearchInterface } from "@/components/search/search-interface"
import { FinderCta } from "@/components/layout/finder-cta"
import { Skeleton } from "@/components/ui/skeleton"

function SearchSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1">
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
      <div className="lg:col-span-3 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Find Your Artist</h1>
            <p className="mt-4 mx-auto max-w-2xl text-lg text-muted-foreground">
              Search artists and shops by style, price, and availability.
            </p>
          </div>
          <div className="max-w-2xl mx-auto mb-10">
            <FinderCta />
          </div>
          <Suspense fallback={<SearchSkeleton />}>
            <SearchInterface />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  )
}
