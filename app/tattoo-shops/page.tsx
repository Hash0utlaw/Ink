import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { getStatesWithShopCounts } from "@/lib/supabase/seo"
import { STATE_ABBR_TO_NAME, stateAbbrToSlug } from "@/lib/utils/states"
import { MapPin } from "lucide-react"

export const metadata: Metadata = {
  title: "Tattoo Shops by State — TattooMaps",
  description: "Browse tattoo shops across all 50 US states. Find top-rated studios near you with artist portfolios, reviews, and booking.",
}

export default async function TattooShopsIndexPage() {
  const states = await getStatesWithShopCounts()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1">
        <div className="border-b border-border/50 bg-muted/30">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-6 h-6 text-[#7C3AED]" />
              <h1 className="text-3xl font-extrabold">Tattoo Shops in the US</h1>
            </div>
            <p className="text-muted-foreground">
              {states.reduce((sum, s) => sum + s.count, 0).toLocaleString()} studios across {states.length} states
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {states.map(({ state, count }) => {
              const name = STATE_ABBR_TO_NAME[state] ?? state
              const slug = stateAbbrToSlug(state)
              return (
                <Link
                  key={state}
                  href={`/tattoo-shops/${slug}`}
                  className="group flex flex-col p-4 rounded-xl border border-border/50 bg-card hover:border-[#7C3AED]/40 hover:shadow-md transition-all"
                >
                  <span className="font-bold text-sm group-hover:text-[#7C3AED] transition-colors">{name}</span>
                  <span className="text-xs text-muted-foreground mt-1">{count.toLocaleString()} shops</span>
                </Link>
              )
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
