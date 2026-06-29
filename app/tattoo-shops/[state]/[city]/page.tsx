import { notFound } from "next/navigation"
import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, MapPin, Phone, Globe, ChevronRight } from "lucide-react"
import { getShopsForCity, getTopCities } from "@/lib/supabase/seo"
import { STATE_ABBR_TO_NAME, stateAbbrToSlug, cityToSlug } from "@/lib/utils/states"
import { FinderCta } from "@/components/layout/finder-cta"
import type { Shop } from "@/types/shop"

export async function generateStaticParams() {
  const top = await getTopCities(50)
  return top.map(({ city, state }) => ({
    state: stateAbbrToSlug(state),
    city: cityToSlug(city),
  }))
}

export async function generateMetadata({
  params,
}: {
  params: { state: string; city: string }
}): Promise<Metadata> {
  const { cityName, stateAbbr, count } = await getShopsForCity(params.city, params.state, 0, 1)
  const stateName = STATE_ABBR_TO_NAME[stateAbbr] ?? stateAbbr

  return {
    title: `Best Tattoo Shops in ${cityName}, ${stateAbbr} — TattooMaps`,
    description: `Browse ${count} tattoo studios in ${cityName}, ${stateName}. Compare artist portfolios, read reviews, and book your appointment on TattooMaps.`,
    openGraph: {
      title: `Best Tattoo Shops in ${cityName}, ${stateAbbr}`,
      description: `${count} tattoo studios in ${cityName}, ${stateName}.`,
    },
  }
}

function ShopCard({ shop, priority = false }: { shop: Shop; priority?: boolean }) {
  return (
    <Link
      href={`/shops/${shop.id}`}
      className="group flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden hover:border-[#7C3AED]/40 hover:shadow-md transition-all"
    >
      {shop.coverImageUrl ? (
        <div className="relative h-36 overflow-hidden bg-muted">
          <Image
            src={shop.coverImageUrl}
            alt={shop.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            priority={priority}
          />
        </div>
      ) : (
        <div className="h-36 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-muted-foreground/30" />
        </div>
      )}

      <div className="p-4 space-y-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-sm leading-tight">{shop.name}</h3>
          {shop.rating > 0 && (
            <div className="flex items-center gap-0.5 shrink-0">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-semibold">{shop.rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({shop.reviewCount})</span>
            </div>
          )}
        </div>

        {shop.location.address && (
          <p className="text-xs text-muted-foreground line-clamp-1">{shop.location.address}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {shop.acceptsWalkIns && (
            <Badge variant="secondary" className="text-xs">Walk-ins welcome</Badge>
          )}
          {shop.specialties.slice(0, 2).map((s) => (
            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
          ))}
        </div>
      </div>
    </Link>
  )
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: { state: string; city: string }
  searchParams: { page?: string }
}) {
  const page = parseInt(searchParams.page ?? "0")
  const { data: shops, count, cityName, stateAbbr } = await getShopsForCity(
    params.city,
    params.state,
    page,
    24
  )

  if (!stateAbbr || shops.length === 0) notFound()

  const stateName = STATE_ABBR_TO_NAME[stateAbbr] ?? stateAbbr
  const stateSlug = stateAbbrToSlug(stateAbbr)

  // JSON-LD for the city page
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Tattoo Shops in ${cityName}, ${stateAbbr}`,
    "description": `${count} tattoo studios in ${cityName}, ${stateName}`,
    "numberOfItems": count,
    "itemListElement": shops.slice(0, 10).map((shop, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "LocalBusiness",
        "name": shop.name,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": shop.location.address,
          "addressLocality": shop.location.city,
          "addressRegion": shop.location.state,
          "addressCountry": "US",
        },
        ...(shop.rating > 0 && {
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": shop.rating,
            "reviewCount": shop.reviewCount,
          },
        }),
      },
    })),
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b border-border/50 bg-muted/30">
          <div className="container mx-auto px-4 py-3 text-sm text-muted-foreground flex items-center gap-1.5">
            <Link href="/tattoo-shops" className="hover:text-foreground transition-colors">All States</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/tattoo-shops/${stateSlug}`} className="hover:text-foreground transition-colors">{stateName}</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">{cityName}</span>
          </div>
        </div>

        {/* Hero */}
        <div className="border-b border-border/50 bg-muted/30">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
              Tattoo Shops in {cityName}, {stateAbbr}
            </h1>
            <p className="text-muted-foreground">
              {count.toLocaleString()} studios · {stateName}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 space-y-8">
          <FinderCta />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shops.map((shop, i) => (
              <ShopCard key={shop.id} shop={shop} priority={i === 0} />
            ))}
          </div>

          {count > 24 && (
            <div className="flex justify-center gap-3 pt-4">
              {page > 0 && (
                <Button variant="outline" asChild>
                  <Link href={`/tattoo-shops/${params.state}/${params.city}?page=${page - 1}`}>← Previous</Link>
                </Button>
              )}
              {(page + 1) * 24 < count && (
                <Button variant="outline" asChild>
                  <Link href={`/tattoo-shops/${params.state}/${params.city}?page=${page + 1}`}>Next →</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
