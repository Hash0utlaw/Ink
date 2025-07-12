import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PortfolioGallery } from "./portfolio-gallery"
import { AboutSection } from "./about-section"
import { ReviewsSection } from "./reviews-section"
import type { Artist } from "@/types/artist"

export function ProfileTabs({ artist }: { artist: Artist }) {
  return (
    <Tabs defaultValue="portfolio" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
        <TabsTrigger value="about">About</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
      </TabsList>
      <TabsContent value="portfolio" className="mt-6">
        <PortfolioGallery images={artist.portfolioImages} />
      </TabsContent>
      <TabsContent value="about" className="mt-6">
        <AboutSection bio={artist.bio} />
      </TabsContent>
      <TabsContent value="reviews" className="mt-6">
        <ReviewsSection reviews={artist.reviews} />
      </TabsContent>
    </Tabs>
  )
}
