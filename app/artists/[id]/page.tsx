import { notFound, permanentRedirect } from "next/navigation"
import { Suspense } from "react"
import type { Metadata } from "next"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getArtistById, getArtistShop, getOtherShopArtists, shopArtistRedirectPath } from "@/lib/supabase/artists"
import { getCurrentUserId } from "@/lib/supabase/users"
import { getSavedIdsForUser } from "@/lib/supabase/saved"
import { getReviewsForArtist } from "@/lib/supabase/reviews"
import { ProfileCover } from "@/components/brand/profile-cover"
import { ArtistHeader } from "@/components/artist-profile/artist-header"
import { uploadedImageSrc } from "@/lib/utils/safe-image"
import { ProfileSections } from "@/components/artist-profile/profile-sections"
import { AlsoAtShop } from "@/components/artist-profile/also-at-shop"
import { BookingSection } from "@/components/artist-profile/booking-section"
import { RecordVisit } from "@/components/artist-profile/record-visit"
import { styleLabels } from "@/lib/styles"
import { artistHasNameTwin } from "@/lib/supabase/seo"
import { canonicalUrl, jsonLdHtml, metaDescription } from "@/lib/seo"

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const artist = await getArtistById(params.id)
  if (!artist) return { title: "Tattoo Artist — TattooMaps" }

  const labels = styleLabels(artist.styles)
  const primaryStyle = labels[0] ?? "Tattoo"
  const loc = [artist.location.city, artist.location.state].filter(Boolean).join(", ")
  const coverImage = artist.portfolioImages?.[0] ?? artist.avatarUrl ?? "/opengraph-image"

  // Another active artist shares this name and city: add the (unique) handle so the title stays unique.
  const twin = await artistHasNameTwin({
    id: artist.id,
    name: artist.name,
    city: artist.location.city,
    state: artist.location.state,
  })
  const name = twin && artist.handle ? `${artist.name} (@${artist.handle})` : artist.name
  const at = artist.shopName ? ` at ${artist.shopName}` : ""

  return {
    // "{Name}, tattoo artist in {City}, {ST} | TattooMaps"
    title: `${name}, tattoo artist${loc ? ` in ${loc}` : ""} | TattooMaps`,
    description: metaDescription(
      `Book ${name}, a ${primaryStyle.toLowerCase()} tattoo artist${at}${loc ? ` in ${loc}` : ""}. View portfolio, read reviews, and book your appointment on TattooMaps.`,
    ),
    alternates: { canonical: canonicalUrl(`/artists/${artist.id}`) },
    openGraph: {
      title: `${artist.name} | TattooMaps`,
      description: `${primaryStyle} tattoo artist${loc ? ` in ${loc}` : ""}. View portfolio and book on TattooMaps.`,
      images: coverImage ? [{ url: coverImage, width: 1200, height: 630, alt: artist.name }] : ["/opengraph-image"],
    },
  }
}

export default async function ArtistProfilePage({ params }: { params: { id: string } }) {
  const artist = await getArtistById(params.id)

  if (!artist) {
    // Old links used shop_artists row ids; send those to the real profile (or the shop), 308.
    const redirectPath = await shopArtistRedirectPath(params.id)
    if (redirectPath) permanentRedirect(redirectPath)
    notFound()
  }

  const userId = await getCurrentUserId()
  const savedIds = userId ? await getSavedIdsForUser(userId, "artist") : []
  const isSaved = savedIds.includes(artist.id)
  const [reviews, shop, others] = await Promise.all([
    getReviewsForArtist(artist.id),
    artist.shopId ? getArtistShop(artist.shopId) : Promise.resolve(null),
    artist.shopId ? getOtherShopArtists(artist.shopId, artist.id) : Promise.resolve({ artists: [], total: 0 }),
  ])

  const loc = [artist.location.city, artist.location.state].filter(Boolean).join(", ")
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": artist.name,
    "hasOccupation": {
      "@type": "Occupation",
      "name": "Tattoo Artist",
      "occupationalCategory": styleLabels(artist.styles).join(", ") || undefined,
    },
    "image": artist.avatarUrl || undefined,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": artist.location.city,
      "addressRegion": artist.location.state,
      "addressCountry": "US",
    },
    ...(artist.instagramHandle && {
      "sameAs": [`https://www.instagram.com/${artist.instagramHandle.replace("@", "")}`],
    }),
    ...(artist.rating > 0 && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": artist.rating,
        "reviewCount": artist.reviewCount,
        "bestRating": 5,
        "worstRating": 1,
      },
    }),
  }

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
        {/* Full bleed, flush under the site header; the header plate and panel overlap its bottom. */}
        <ProfileCover src={uploadedImageSrc(artist.coverImageUrl)} alt={`${artist.name}'s cover image`} />
        <div className="mx-auto max-w-[1180px] px-4 pb-8 sm:px-6 lg:pb-14">
          <RecordVisit
            id={artist.id}
            name={artist.name}
            handle={artist.handle}
            avatarUrl={artist.avatarUrl}
            city={artist.location.city}
          />
          <ArtistHeader
            artist={artist}
            initialSaved={isSaved}
            shopHref={shop ? `/shops/${shop.id}` : null}
            shop={shop}
          />
          <div className="mt-14 grid grid-cols-1 gap-14 lg:mt-20 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
            <ProfileSections artist={artist} reviews={reviews} />
            <BookingSection artist={artist} />
          </div>
          {shop && others.artists.length > 0 && (
            <div className="mt-14 lg:mt-20">
              <AlsoAtShop shopId={shop.id} artists={others.artists} total={others.total} />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
