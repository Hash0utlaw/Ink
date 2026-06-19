import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { FlashCard } from "@/components/flash/flash-card"
import { FlashFiltersBar } from "@/components/flash/flash-filters-bar"
import { getFlashListings } from "@/lib/supabase/flash"
import { Zap } from "lucide-react"

export const metadata: Metadata = {
  title: "Flash Tattoos — Browse & Book | TattooMaps",
  description: "Browse ready-to-book flash tattoo designs from artists across the US. Filter by style, price, and location.",
}

const STYLES = ["Traditional", "Neo-Traditional", "Japanese", "Blackwork", "Fine Line", "Realism", "Watercolor", "Geometric"]

export default async function FlashPage({
  searchParams,
}: {
  searchParams: { style?: string; state?: string; city?: string; minPrice?: string; maxPrice?: string; page?: string }
}) {
  const page = parseInt(searchParams.page ?? "0")
  const { data: listings, count } = await getFlashListings({
    style: searchParams.style,
    state: searchParams.state,
    city: searchParams.city,
    minPrice: searchParams.minPrice ? parseFloat(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? parseFloat(searchParams.maxPrice) : undefined,
    page,
    pageSize: 24,
  })

  const hasFilters = !!(searchParams.style || searchParams.state || searchParams.city || searchParams.minPrice || searchParams.maxPrice)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1">
        {/* Hero bar */}
        <div className="border-b border-border/50 bg-muted/30">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-[#7C3AED]/20 p-2">
                  <Zap className="w-5 h-5 text-[#7C3AED]" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold">Flash</h1>
                  <p className="text-sm text-muted-foreground">
                    Ready-to-book designs{count > 0 ? ` · ${count} available` : ""}
                  </p>
                </div>
              </div>
              {hasFilters && (
                <Link
                  href="/flash"
                  className="text-xs text-[#7C3AED] hover:underline shrink-0"
                >
                  Clear filters
                </Link>
              )}
            </div>

            {/* Style quick-filters */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <Link
                href="/flash"
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  !searchParams.style
                    ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                    : "border-border text-muted-foreground hover:bg-muted/60"
                }`}
              >
                All styles
              </Link>
              {STYLES.map((s) => {
                const params = new URLSearchParams({ ...searchParams, style: s })
                params.delete("page")
                return (
                  <Link
                    key={s}
                    href={`/flash?${params}`}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      searchParams.style === s
                        ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                        : "border-border text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    {s}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {listings.length === 0 ? (
            <div className="py-24 text-center">
              <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-semibold">No flash available{hasFilters ? " for these filters" : " yet"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {hasFilters ? "Try adjusting your filters." : "Check back soon — artists are uploading."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {listings.map((listing) => (
                  <FlashCard key={listing.id} listing={listing} />
                ))}
              </div>

              {/* Pagination */}
              {count > 24 && (
                <div className="mt-10 flex justify-center gap-3">
                  {page > 0 && (
                    <Link
                      href={`/flash?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}
                      className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/60 transition-colors"
                    >
                      ← Previous
                    </Link>
                  )}
                  {(page + 1) * 24 < count && (
                    <Link
                      href={`/flash?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}
                      className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/60 transition-colors"
                    >
                      Next →
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
