import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Star, MapPin } from "lucide-react"
import type { Artist } from "@/types/artist"

interface ArtistCardProps {
  artist: Artist
  distance?: number
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")
}

export function ArtistCard({ artist, distance }: ArtistCardProps) {
  const hasRating = artist.rating > 0
  const city = artist.location.city
  const state = (artist as unknown as Record<string, unknown>).state as string | undefined
  const locationLine = [city, state].filter(Boolean).join(", ")

  return (
    <Card className="overflow-hidden transition-all hover:border-accent/50 hover:-translate-y-1 flex flex-col">
      <CardHeader className="flex flex-row items-start gap-4 p-4">
        <Avatar className="w-14 h-14 border-2 border-accent shrink-0">
          <AvatarImage src={artist.avatarUrl || ""} alt={artist.name} />
          <AvatarFallback className="text-lg font-bold bg-accent/10 text-accent">
            {initials(artist.name) || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-lg leading-tight truncate">{artist.name}</h3>
            {distance != null && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 whitespace-nowrap shrink-0">
                {distance.toFixed(1)} mi
              </span>
            )}
          </div>

          {artist.shopName && (
            <p className="text-sm text-muted-foreground truncate">{artist.shopName}</p>
          )}

          {locationLine && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{locationLine}</span>
            </div>
          )}

          {hasRating && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium">{artist.rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({artist.reviewCount})</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-1">
        {artist.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {artist.specialties.slice(0, 5).map((spec) => (
              <Badge key={spec} variant="secondary" className="text-xs">
                {spec}
              </Badge>
            ))}
            {artist.specialties.length > 5 && (
              <Badge variant="secondary" className="text-xs">
                +{artist.specialties.length - 5}
              </Badge>
            )}
          </div>
        )}

        {artist.bio && (
          <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{artist.bio}</p>
        )}

        {artist.specialties.length === 0 && !artist.bio && (
          <p className="text-xs text-muted-foreground italic">No style info yet</p>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex gap-2">
        {artist.isAvailable && (
          <Badge variant="outline" className="border-green-400 text-green-400 text-xs">
            Available
          </Badge>
        )}
        <Button asChild className="flex-1">
          <Link href={`/artists/${artist.id}`}>View Profile</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export function ArtistCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-4 p-4">
        <Skeleton className="w-14 h-14 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3.5 w-1/3" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  )
}
