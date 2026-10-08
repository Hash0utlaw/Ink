import { notFound } from "next/navigation"
import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { AlertCircle, ChevronRight } from "lucide-react"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { getShopById, getShopArtists } from "@/lib/supabase/shops"
import { getCurrentUserId } from "@/lib/supabase/users"
import { getSavedIdsForUser } from "@/lib/supabase/saved"
import { getReviewsForShop } from "@/lib/supabase/reviews"
import { ShopHeader } from "@/components/shop-profile/shop-header"
import { ShopTabs } from "@/components/shop-profile/shop-tabs"
import { ShopInfoSidebar } from "@/components/shop-profile/shop-info-sidebar"
import { cityToSlug, stateAbbrToSlug } from "@/lib/utils/states"
import { shopHasNameTwin } from "@/lib/supabase/seo"
import { canonicalUrl, jsonLdHtml, metaDescription, withoutEmpty } from "@/lib/seo"

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const shop = await getShopById(params.id)
  if (!shop) return { title: "Tattoo Shop — TattooMaps" }
  const loc = [shop.location.city, shop.location.state].filter(Boolean).join(", ")
  const street = shop.location.address?.split(",")[0]?.trim()
  // Another listed shop shares this name and city: add the street so the title stays unique.
  const place = street && (await shopHasNameTwin(shop)) ? [street, loc].filter(Boolean).join(", ") : loc
  const rating = shop.rating > 0 && shop.reviewCount > 0 ? ` Rated ${shop.rating}/5 from ${shop.reviewCount} reviews.` : ""
  const summary = shop.about || "Browse artist portfolios and read reviews on TattooMaps."
  return {
    title: `${shop.name}${place ? ` — ${place}` : ""} | TattooMaps`,
    description: metaDescription(
      `${shop.name} is a tattoo shop${street ? ` at ${street}` : ""}${loc ? `, ${loc}` : ""}.${rating} ${summary}`,
    ),
    alternates: { canonical: canonicalUrl(`/shops/${shop.id}`) },
  }
}

export default async function ShopProfilePage({ params }: { params: { id: string } }) {
  const shop = await getShopById(params.id)
  if (!shop) notFound()

  const residentArtists = await getShopArtists(params.id)
  const userId = await getCurrentUserId()
  const savedIds = userId ? await getSavedIdsForUser(userId, "shop") : []
  const isSaved = savedIds.includes(shop.id)
  const reviews = await getReviewsForShop(shop.id)

  const stateSlug = stateAbbrToSlug(shop.location.state)
  const citySlug = cityToSlug(shop.location.city)
  const cityPageHref = stateSlug && citySlug ? `/tattoo-shops/${stateSlug}/${citySlug}` : null

  // JSON-LD LocalBusiness schema (TattooParlor). Empty fields are dropped.
  const jsonLd = withoutEmpty({
    "@context": "https://schema.org",
    "@type": "TattooParlor",
    "name": shop.name,
    "description": shop.about,
    "image": shop.coverImageUrl,
    "telephone": shop.phone,
    "url": canonicalUrl(`/shops/${shop.id}`),
    "sameAs": shop.website ? [shop.website] : undefined,
    "address": {
      "@type": "PostalAddress",
      // Some addresses also hold "City, ST 12345"; keep only the street.
      "streetAddress": shop.location.address?.split(",")[0],
      "addressLocality": shop.location.city,
      "addressRegion": shop.location.state,
      "addressCountry": "US",
    },
    "geo":
      shop.location.lat && shop.location.lng
        ? { "@type": "GeoCoordinates", "latitude": shop.location.lat, "longitude": shop.location.lng }
        : undefined,
    "aggregateRating":
      shop.rating > 0 && shop.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            "ratingValue": shop.rating,
            "reviewCount": shop.reviewCount,
            "bestRating": 5,
            "worstRating": 1,
          }
        : undefined,
  })

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
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
        {shop.possiblyClosed && (
          <div className="container mx-auto px-4 pt-4">
            <div className="flex items-start gap-2.5 text-sm p-3.5 rounded-lg border bg-warning border-warning text-warning-foreground">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                This shop may be permanently closed.{" "}
                <Link href={`/claim?shop=${encodeURIComponent(shop.slug)}`} className="underline hover:text-foreground transition-colors">
                  Own this shop? Claim this listing
                </Link>
              </span>
            </div>
          </div>
        )}
        <ShopHeader shop={shop} initialSaved={isSaved} />
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ShopTabs shop={shop} residentArtists={residentArtists} reviews={reviews} />
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
