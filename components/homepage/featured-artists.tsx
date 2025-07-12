import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star } from "lucide-react"
import { MotionView } from "@/components/utils/motion-view"

const artists = [
  {
    name: "Anka Lavriv",
    specialty: "Fine Line, Botanical",
    rating: 4.9,
    avatar: "AL",
    imageQuery: "female+tattoo+artist+portrait",
  },
  {
    name: "Mister Cartoon",
    specialty: "Chicano, Fine Line",
    rating: 5.0,
    avatar: "MC",
    imageQuery: "male+tattoo+artist+portrait",
  },
  {
    name: "Sasha Unisex",
    specialty: "Watercolor, Geometric",
    rating: 4.8,
    avatar: "SU",
    imageQuery: "female+tattoo+artist+with+tattoos",
  },
  {
    name: "Dr. Woo",
    specialty: "Single Needle, Micro-Realism",
    rating: 4.9,
    avatar: "DW",
    imageQuery: "male+tattoo+artist+in+studio",
  },
]

export function FeaturedArtists() {
  return (
    <section className="py-12 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <MotionView>
          <h2 className="text-3xl font-bold text-center mb-12">Featured Artists</h2>
        </MotionView>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {artists.map((artist, i) => (
            <MotionView key={artist.name} delay={i * 0.1}>
              <Card className="overflow-hidden bg-card border-border/60 transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <Avatar className="w-24 h-24 mb-4 border-2 border-accent">
                    <AvatarImage
                      src={`/abstract-geometric-shapes.png?height=100&width=100&query=${artist.imageQuery}`}
                      alt={artist.name}
                    />
                    <AvatarFallback>{artist.avatar}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-bold text-xl">{artist.name}</h3>
                  <p className="text-accent text-sm">{artist.specialty}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-muted-foreground">{artist.rating}</span>
                  </div>
                </CardContent>
              </Card>
            </MotionView>
          ))}
        </div>
      </div>
    </section>
  )
}
