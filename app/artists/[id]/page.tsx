import { notFound } from "next/navigation"
import { Suspense } from "react"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getArtistById } from "@/lib/mock-data"
import { ArtistHeader } from "@/components/artist-profile/artist-header"
import { ProfileTabs } from "@/components/artist-profile/profile-tabs"
import { InfoSidebar } from "@/components/artist-profile/info-sidebar"

export default async function ArtistProfilePage({ params }: { params: { id: string } }) {
  const artist = await getArtistById(params.id)

  if (!artist) {
    notFound()
  }

  return (
    <div className="flex min-h-screen flex-col">
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
              <InfoSidebar artist={artist} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
