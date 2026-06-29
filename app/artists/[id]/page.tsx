import { notFound } from "next/navigation"
import { Suspense } from "react"
import type { Metadata } from "next"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getArtistById } from "@/lib/supabase/artists"
import { ArtistHeader } from "@/components/artist-profile/artist-header"
import { ProfileTabs } from "@/components/artist-profile/profile-tabs"
import { BookingSection } from "@/components/artist-profile/booking-section"

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const artist = await getArtistById(params.id)
  if (!artist) return { title: "Tattoo Artist — TattooMaps" }

  const primaryStyle = artist.specialties?.[0] ?? "Tattoo"
  const loc = [artist.location.city, artist.location.state].filter(Boolean).join(", ")
  const styleList = artist.specialties?.slice(0, 3).join(", ") ?? primaryStyle
  const coverImage = artist.portfolioImages?.[0] ?? artist.avatarUrl ?? "/og-image.png"

  return {
    title: `${artist.name} — ${styleList} Tattoo Artist${loc ? ` in ${loc}` : ""} | TattooMaps`,
    description: `Book ${artist.name}, a ${primaryStyle.toLowerCase()} tattoo artist${loc ? ` in ${loc}` : ""}. View portfolio, read reviews, and book your appointment on TattooMaps.`,
    openGraph: {
      title: `${artist.name} | TattooMaps`,
      description: `${primaryStyle} tattoo artist${loc ? ` in ${loc}` : ""}. View portfolio and book on TattooMaps.`,
      images: coverImage ? [{ url: coverImage, width: 1200, height: 630, alt: artist.name }] : ["/og-image.png"],
    },
  }
}

export default async function ArtistProfilePage({ params }: { params: { id: string } }) {
  const artist = await getArtistById(params.id)

  if (!artist) {
    notFound()
  }

  const loc = [artist.location.city, artist.location.state].filter(Boolean).join(", ")
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": artist.name,
    "hasOccupation": {
      "@type": "Occupation",
      "name": "Tattoo Artist",
      "occupationalCategory": artist.specialties?.join(", ") || undefined,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <ArtistHeader artist={artist} />
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ProfileTabs artist={artist} />
            </div>
            <div className="lg:col-span-1">
              <BookingSection artist={artist} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
