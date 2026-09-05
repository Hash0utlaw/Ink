import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PortfolioGallery } from "./portfolio-gallery"
import { AboutSection } from "./about-section"
import { ReviewsSection } from "./reviews-section"
import type { Artist } from "@/types/artist"
import type { Review } from "@/lib/supabase/reviews"

export function ProfileTabs({ artist, reviews }: { artist: Artist; reviews: Review[] }) {
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
        <AboutSection bio={artist.bio} handle={artist.handle} isClaimed={artist.isClaimed} />
      </TabsContent>
      <TabsContent value="reviews" className="mt-6">
        <ReviewsSection reviews={reviews} />
      </TabsContent>
    </Tabs>
  )
}
