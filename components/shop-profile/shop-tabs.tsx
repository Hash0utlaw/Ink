import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResidentArtistsList } from "./resident-artists-list"
import { AboutSection } from "@/components/artist-profile/about-section"
import { ReviewsSection } from "@/components/artist-profile/reviews-section"
import type { Shop } from "@/types/shop"
import type { Artist } from "@/types/artist"

interface ShopTabsProps {
  shop: Shop
  residentArtists: Artist[]
}

export function ShopTabs({ shop, residentArtists }: ShopTabsProps) {
  return (
    <Tabs defaultValue="artists" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="artists">Artists ({residentArtists.length})</TabsTrigger>
        <TabsTrigger value="about">About</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
      </TabsList>
      <TabsContent value="artists" className="mt-6">
        <ResidentArtistsList artists={residentArtists} />
      </TabsContent>
      <TabsContent value="about" className="mt-6">
        <AboutSection bio={shop.about} />
      </TabsContent>
      <TabsContent value="reviews" className="mt-6">
        <ReviewsSection reviews={shop.reviews} />
      </TabsContent>
    </Tabs>
  )
}
