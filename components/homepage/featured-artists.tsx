import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Star } from "lucide-react"
import { MotionView } from "@/components/utils/motion-view"
import Link from "next/link"
import type { Artist } from "@/types/artist"

const FALLBACK_ARTISTS = [
  { name: "Anka Lavriv", specialty: "Fine Line, Botanical", rating: 4.9, avatar: "AL" },
  { name: "Mister Cartoon", specialty: "Chicano, Fine Line", rating: 5.0, avatar: "MC" },
  { name: "Sasha Unisex", specialty: "Watercolor, Geometric", rating: 4.8, avatar: "SU" },
  { name: "Dr. Woo", specialty: "Single Needle, Micro-Realism", rating: 4.9, avatar: "DW" },
]

interface FeaturedArtistsProps {
  artists?: Artist[]
}

export function FeaturedArtists({ artists }: FeaturedArtistsProps) {
  const realArtists = artists && artists.length > 0 ? artists.slice(0, 4) : null

  return (
    <section className="py-12 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <MotionView>
          <h2 className="text-3xl font-bold text-center mb-12">Featured Artists</h2>
        </MotionView>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {realArtists
            ? realArtists.map((artist, i) => (
                <MotionView key={artist.id} delay={i * 0.1}>
                  <Link href={`/artists/${artist.id}`} className="block h-full">
                    <Card className="overflow-hidden h-full bg-card border-border/60 transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]">
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <Avatar className="w-24 h-24 mb-4 border-2 border-accent">
                          <AvatarImage src={artist.avatarUrl || "/placeholder.svg"} alt={artist.name} />
                          <AvatarFallback>{artist.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <h3 className="font-bold text-xl">{artist.name}</h3>
                        <p className="text-accent text-sm">{artist.specialties.slice(0, 2).join(", ")}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-muted-foreground">{artist.rating}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </MotionView>
              ))
            : FALLBACK_ARTISTS.map((artist, i) => (
                <MotionView key={artist.name} delay={i * 0.1}>
                  <Card className="overflow-hidden bg-card border-border/60 transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <Avatar className="w-24 h-24 mb-4 border-2 border-accent">
                        <AvatarImage src="/abstract-geometric-shapes.png?height=100&width=100" alt={artist.name} />
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

export function FeaturedArtistsSkeleton() {
  return (
    <section className="py-12 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <Skeleton className="h-9 w-64 mx-auto mb-12" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden bg-card border-border/60">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Skeleton className="w-24 h-24 rounded-full mb-4" />
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
