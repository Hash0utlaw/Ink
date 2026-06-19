import { notFound } from "next/navigation"
import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { getShopById, getShopArtists } from "@/lib/supabase/shops"
import { ShopHeader } from "@/components/shop-profile/shop-header"
import { ShopTabs } from "@/components/shop-profile/shop-tabs"
import { ShopInfoSidebar } from "@/components/shop-profile/shop-info-sidebar"
import { cityToSlug, stateAbbrToSlug } from "@/lib/utils/states"

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const shop = await getShopById(params.id)
  if (!shop) return { title: "Tattoo Shop — TattooMaps" }
  const loc = [shop.location.city, shop.location.state].filter(Boolean).join(", ")
  return {
    title: `${shop.name}${loc ? ` — ${loc}` : ""} | TattooMaps`,
    description: shop.about
      ? shop.about.slice(0, 160)
      : `Book an appointment at ${shop.name}${loc ? ` in ${loc}` : ""}. Browse artist portfolios and read reviews on TattooMaps.`,
  }
}

export default async function ShopProfilePage({ params }: { params: { id: string } }) {
  const shop = await getShopById(params.id)
  if (!shop) notFound()

  const residentArtists = await getShopArtists(params.id)

  const stateSlug = stateAbbrToSlug(shop.location.state)
  const citySlug = cityToSlug(shop.location.city)
  const cityPageHref = stateSlug && citySlug ? `/tattoo-shops/${stateSlug}/${citySlug}` : null

  // JSON-LD LocalBusiness schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TattooParlor",
    "name": shop.name,
    "description": shop.about || undefined,
    "image": shop.coverImageUrl || undefined,
    "telephone": shop.phone || undefined,
    "url": shop.website || undefined,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": shop.location.address,
      "addressLocality": shop.location.city,
      "addressRegion": shop.location.state,
      "addressCountry": "US",
    },
    ...(shop.location.lat && shop.location.lng && {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": shop.location.lat,
        "longitude": shop.location.lng,
      },
    }),
    ...(shop.rating > 0 && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": shop.rating,
        "reviewCount": shop.reviewCount,
        "bestRating": 5,
        "worstRating": 1,
      },
    }),
  }

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1 bg-background">
        {cityPageHref && (
          <div className="container mx-auto px-4 pt-4">
            <nav className="flex items-center gap-1 text-xs text-muted-foreground">
              <Link href="/tattoo-shops" className="hover:text-foreground transition-colors">Tattoo Shops</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href={`/tattoo-shops/${stateSlug}`} className="hover:text-foreground transition-colors capitalize">
                {shop.location.state}
              </Link>
              <ChevronRight className="w-3 h-3" />
              <Link href={cityPageHref} className="hover:text-foreground transition-colors">
                {shop.location.city}
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground">{shop.name}</span>
            </nav>
          </div>
        )}
        <ShopHeader shop={shop} />
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ShopTabs shop={shop} residentArtists={residentArtists} />
            </div>
            <div className="lg:col-span-1">
              <ShopInfoSidebar shop={shop} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
