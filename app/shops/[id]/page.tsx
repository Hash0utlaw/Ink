import { notFound } from "next/navigation"
import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { getShopById, getShopArtists, getShopsNearMe } from "@/lib/supabase/shops"
import { getCurrentUserId } from "@/lib/supabase/users"
import { getSavedIdsForUser } from "@/lib/supabase/saved"
import { getReviewsForShop } from "@/lib/supabase/reviews"
import type { Shop } from "@/types/shop"
import type { ArtistShop } from "@/lib/supabase/artists"
import { ShopHeader } from "@/components/shop-profile/shop-header"
import { ProfileCover } from "@/components/brand/profile-cover"
import { uploadedImageSrc } from "@/lib/utils/safe-image"
import { ShopArtists } from "@/components/shop-profile/shop-artists"
import { NearbyShops } from "@/components/shop-profile/nearby-shops"
import { WhereToFind } from "@/components/artist-profile/where-to-find"
import { ProfileSection, ReviewList } from "@/components/artist-profile/profile-sections"
import { STATE_ABBR_TO_NAME, cityToSlug, stateAbbrToSlug } from "@/lib/utils/states"
import { shopHasNameTwin } from "@/lib/supabase/seo"
import { canonicalUrl, jsonLdHtml, metaDescription, withoutEmpty } from "@/lib/seo"

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const shop = await getShopById(params.id)
  if (!shop) return { title: "Tattoo Shop | TattooMaps" }
  const loc = [shop.location.city, shop.location.state].filter(Boolean).join(", ")
  const street = shop.location.address?.split(",")[0]?.trim()
  // Another listed shop shares this name and city: add the street so the title stays unique.
  const twin = !!street && (await shopHasNameTwin(shop))
  const rating = shop.rating > 0 && shop.reviewCount > 0 ? ` Rated ${shop.rating}/5 from ${shop.reviewCount} reviews.` : ""
  const summary = shop.about || "Browse artist portfolios and read reviews on TattooMaps."
  return {
    // "{Shop}, tattoo shop in {City}, {ST} | TattooMaps"
    title: twin
      ? `${shop.name}, tattoo shop at ${[street, loc].filter(Boolean).join(", ")} | TattooMaps`
      : `${shop.name}, tattoo shop${loc ? ` in ${loc}` : ""} | TattooMaps`,
    description: metaDescription(
      `${shop.name} is a tattoo shop${street ? ` at ${street}` : ""}${loc ? `, ${loc}` : ""}.${rating} ${summary}`,
    ),
    alternates: { canonical: canonicalUrl(`/shops/${shop.id}`) },
  }
}

/** The shop in the shape the artist page's "Where to find" block takes. */
function toWhereShop(shop: Shop): ArtistShop {
  const { lat, lng } = shop.location
  return {
    id: shop.id,
    name: shop.name,
    address: shop.location.address,
    city: shop.location.city,
    state: shop.location.state,
    zip: shop.location.zip ?? "",
    coordinates: lat && lng ? [lng, lat] : null,
    rating: shop.rating,
    reviewCount: shop.reviewCount,
    hours: shop.hours,
  }
}

/** Up to four other active, open shops within about 5 miles, nearest first. */
async function getNearbyShops(shop: Shop): Promise<Shop[]> {
  const { lat, lng } = shop.location
  if (!lat || !lng) return []
  const { data } = await getShopsNearMe(lat, lng, 5)
  return data.filter((s) => s.id !== shop.id).slice(0, 4)
}

const TEXT_LINK = "font-semibold text-navy underline underline-offset-2 hover:no-underline"

export default async function ShopProfilePage({ params }: { params: { id: string } }) {
  const shop = await getShopById(params.id)
  if (!shop) notFound()

  const userId = await getCurrentUserId()
  const [residentArtists, savedIds, reviews, nearby] = await Promise.all([
    getShopArtists(params.id),
    userId ? getSavedIdsForUser(userId, "shop") : Promise.resolve([] as string[]),
    getReviewsForShop(shop.id),
    getNearbyShops(shop),
  ])
  const isSaved = savedIds.includes(shop.id)

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
      <main className="flex-1 bg-paper tex-paper">
        <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 lg:py-14">
          {cityPageHref && (
            <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-ink-muted lg:mb-8">
              <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <li>
                  <Link href="/tattoo-shops" className="underline-offset-2 hover:text-ink hover:underline">
                    Tattoo shops
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href={`/tattoo-shops/${stateSlug}`} className="underline-offset-2 hover:text-ink hover:underline">
                    {STATE_ABBR_TO_NAME[shop.location.state] ?? shop.location.state}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href={cityPageHref} className="underline-offset-2 hover:text-ink hover:underline">
                    {shop.location.city}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-ink">
                  {shop.name}
                </li>
              </ol>
            </nav>
          )}
          {shop.possiblyClosed && (
            <div className="mb-8 rounded-lg border-1.5 border-ink bg-vellum tex-vellum p-5">
              <p className="font-semibold text-ink">This shop may be permanently closed.</p>
              <p className="mt-1 text-[15px] leading-[1.55] text-ink-muted text-pretty">
                Call ahead before you visit. Own this shop?{" "}
                <Link href={`/claim?shop=${encodeURIComponent(shop.slug)}`} className={TEXT_LINK}>
                  Claim this listing
                </Link>
              </p>
            </div>
          )}
          <div className="mb-5 lg:mb-0">
            <ProfileCover src={uploadedImageSrc(shop.coverImageUrl)} alt={`${shop.name}'s cover image`} />
          </div>
          <ShopHeader shop={shop} initialSaved={isSaved} />
          <div className="mt-14 space-y-14 lg:mt-20 lg:space-y-20">
            <ShopArtists shopName={shop.name} artists={residentArtists} />
            <WhereToFind
              name={shop.name}
              shop={toWhereShop(shop)}
              onShopPage
              phone={shop.phone}
              website={shop.website}
            />
            {shop.about && (
              <ProfileSection id="about" title={`About ${shop.name}`}>
                <p className="max-w-prose whitespace-pre-line text-base leading-[1.55] text-ink text-pretty">{shop.about}</p>
              </ProfileSection>
            )}
            <ProfileSection id="reviews" title="Reviews">
              <ReviewList reviews={reviews} hasListingRating={shop.reviewCount > 0} />
            </ProfileSection>
            <NearbyShops shops={nearby} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
