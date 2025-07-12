import { notFound } from "next/navigation"
import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { getShopById, getArtistsByIds } from "@/lib/mock-data"
import { ShopHeader } from "@/components/shop-profile/shop-header"
import { ShopTabs } from "@/components/shop-profile/shop-tabs"
import { ShopInfoSidebar } from "@/components/shop-profile/shop-info-sidebar"

export default async function ShopProfilePage({ params }: { params: { id: string } }) {
  const shop = await getShopById(params.id)

  if (!shop) {
    notFound()
  }

  const residentArtists = await getArtistsByIds(shop.residentArtistIds)

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1 bg-background">
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
