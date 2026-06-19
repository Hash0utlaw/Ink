import { notFound } from "next/navigation"
import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { getCitiesForState } from "@/lib/supabase/seo"
import { STATE_ABBR_TO_NAME, stateSlugToAbbr, stateAbbrToSlug, cityToSlug } from "@/lib/utils/states"
import { ChevronRight, MapPin } from "lucide-react"

export async function generateStaticParams() {
  return Object.keys(STATE_ABBR_TO_NAME).map((abbr) => ({
    state: stateAbbrToSlug(abbr),
  }))
}

export async function generateMetadata({ params }: { params: { state: string } }): Promise<Metadata> {
  const abbr = stateSlugToAbbr(params.state)
  const stateName = abbr ? STATE_ABBR_TO_NAME[abbr] : null
  if (!stateName) return { title: "Tattoo Shops — TattooMaps" }

  return {
    title: `Best Tattoo Shops in ${stateName} — TattooMaps`,
    description: `Find top-rated tattoo studios across ${stateName}. Browse artist portfolios, read reviews, and book your next tattoo.`,
    openGraph: {
      title: `Best Tattoo Shops in ${stateName}`,
      description: `Find top-rated tattoo studios across ${stateName} on TattooMaps.`,
    },
  }
}

export default async function StatePage({ params }: { params: { state: string } }) {
  const abbr = stateSlugToAbbr(params.state)
  if (!abbr) notFound()

  const stateName = STATE_ABBR_TO_NAME[abbr]
  const cities = await getCitiesForState(abbr)

  if (cities.length === 0) notFound()

  const totalShops = cities.reduce((sum, c) => sum + c.count, 0)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b border-border/50 bg-muted/30">
          <div className="container mx-auto px-4 py-3 text-sm text-muted-foreground flex items-center gap-1.5">
            <Link href="/tattoo-shops" className="hover:text-foreground transition-colors">All States</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">{stateName}</span>
          </div>
        </div>

        <div className="border-b border-border/50 bg-muted/30">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-6 h-6 text-[#7C3AED]" />
              <h1 className="text-3xl font-extrabold">Tattoo Shops in {stateName}</h1>
            </div>
            <p className="text-muted-foreground">
              {totalShops.toLocaleString()} studios across {cities.length} cities
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {cities.map(({ city, count }) => (
              <Link
                key={city}
                href={`/tattoo-shops/${params.state}/${cityToSlug(city)}`}
                className="group flex flex-col p-4 rounded-xl border border-border/50 bg-card hover:border-[#7C3AED]/40 hover:shadow-md transition-all"
              >
                <span className="font-bold text-sm group-hover:text-[#7C3AED] transition-colors">{city}</span>
                <span className="text-xs text-muted-foreground mt-1">{count} shops</span>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
