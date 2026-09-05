import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Star } from "lucide-react"
import { MotionView } from "@/components/utils/motion-view"
import Link from "next/link"
import type { Artist } from "@/types/artist"

interface FeaturedArtistsProps {
  artists?: Artist[]
}

export function FeaturedArtists({ artists }: FeaturedArtistsProps) {
  const realArtists = artists && artists.length > 0 ? artists.slice(0, 4) : []

  return (
    <section className="py-12 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <MotionView>
          <h2 className="text-3xl font-bold text-center mb-12">Featured Artists</h2>
        </MotionView>
        {realArtists.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No featured artists yet.</p>
            <Link href="/artists" className="text-accent-text hover:underline text-sm mt-2 inline-block">
              Browse all artists →
            </Link>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {realArtists.map((artist, i) => (
            <MotionView key={artist.id} delay={i * 0.1}>
              <Link href={`/artists/${artist.id}`} className="block h-full">
                <Card className="overflow-hidden h-full bg-card border-border/60 transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <Avatar className="w-24 h-24 mb-4 border-2 border-accent">
                      <AvatarImage src={artist.avatarUrl || "/placeholder.svg"} alt={artist.name} />
                      <AvatarFallback>{artist.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-bold text-xl">{artist.name}</h3>
                    <p className="text-accent-text text-sm">{artist.specialties.slice(0, 2).join(", ")}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-muted-foreground">{artist.rating}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </MotionView>
          ))}
        </div>
        )}
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
