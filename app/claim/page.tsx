import type { Metadata } from "next"
import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { getArtistBySlug } from "@/lib/supabase/artists"
import { getShopBySlug } from "@/lib/supabase/shops"
import { ClaimForm } from "@/components/claim/claim-form"

export function generateMetadata(): Metadata {
  return {
    title: "Claim Your Listing | TattooMaps",
    robots: { index: false, follow: false },
  }
}

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: { artist?: string; shop?: string }
}) {
  const [artist, shop] = await Promise.all([
    searchParams.artist ? getArtistBySlug(searchParams.artist) : Promise.resolve(null),
    searchParams.shop ? getShopBySlug(searchParams.shop) : Promise.resolve(null),
  ])

  const listingName = artist?.name ?? shop?.name ?? null

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1">
        <div className="container mx-auto px-4 py-16 max-w-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Claim Your Listing</h1>
            <p className="text-muted-foreground">
              {listingName ? (
                <>
                  Verify you&apos;re the owner of{" "}
                  <span className="text-foreground font-medium">{listingName}</span> and take control of your
                  profile.
                </>
              ) : (
                "Tell us who you are and which listing is yours — we'll verify and get you set up."
              )}
            </p>
          </div>
          <ClaimForm
            artistSlug={searchParams.artist ?? null}
            shopSlug={searchParams.shop ?? null}
            listingName={listingName}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
