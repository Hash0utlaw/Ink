import { notFound } from "next/navigation"
import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { getShopsForCity } from "@/lib/supabase/seo"
import { STATE_ABBR_TO_NAME, stateAbbrToSlug, cityToSlug } from "@/lib/utils/states"
import { FinderCta } from "@/components/layout/finder-cta"
import { ShopRow, ShopRowList } from "@/components/shops/shop-row"
import { ListingHeader, countLabel } from "@/components/listings/listing-header"
import { Pagination } from "@/components/listings/pagination"

import { canonicalUrl, jsonLdHtml } from "@/lib/seo"
export const dynamic = "force-dynamic"

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
      images: ["/opengraph-image"],
    },
    ...(stateAbbr && {
      alternates: { canonical: canonicalUrl(`/tattoo-shops/${stateAbbrToSlug(stateAbbr)}/${cityToSlug(cityName)}`) },
    }),
  }
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
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />

      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1">
        <div className="mx-auto max-w-[1344px] px-4 py-8 sm:px-6 lg:py-14">
          <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-ink-muted lg:mb-8">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <li>
                <Link href="/tattoo-shops" className="underline-offset-2 hover:text-ink hover:underline">
                  All states
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={`/tattoo-shops/${stateSlug}`} className="underline-offset-2 hover:text-ink hover:underline">
                  {stateName}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-ink">
                {cityName}
              </li>
            </ol>
          </nav>

          <ListingHeader
            title="Tattoo shops"
            suffix={
              <>
                in <span className="font-place italic">{cityName}, {stateAbbr}</span>
              </>
            }
            countLine={countLabel(count, "shop")}
          >
            <div className="mt-3">
              <FinderCta variant="inline" />
            </div>
          </ListingHeader>

          <ShopRowList>
            {shops.map((shop) => (
              <ShopRow key={shop.id} shop={shop} />
            ))}
          </ShopRowList>

          <Pagination
            page={page}
            totalPages={Math.ceil(count / 24)}
            hrefFor={(p) => `/tattoo-shops/${params.state}/${params.city}?page=${p}`}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}
