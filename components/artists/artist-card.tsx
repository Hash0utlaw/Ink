import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Star } from "lucide-react"
import type { Artist } from "@/types/artist"

export function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <Card className="overflow-hidden transition-all hover:border-accent/50 hover:-translate-y-1 flex flex-col">
      <CardHeader className="flex flex-row items-start gap-4 p-4">
        <Avatar className="w-16 h-16 border-2 border-accent">
          <AvatarImage src={artist.avatarUrl || "/placeholder.svg"} alt={artist.name} />
          <AvatarFallback>{artist.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-bold text-xl">{artist.name}</h3>
          <p className="text-sm text-muted-foreground">{artist.shopName}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium">{artist.rating}</span>
              <span className="text-sm text-muted-foreground">({artist.reviewCount})</span>
            </div>
            {artist.isAvailable && (
              <Badge variant="outline" className="border-green-400 text-green-400">
                Available
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1">
        <div className="flex flex-wrap gap-2 mb-4">
          {artist.specialties.map((spec) => (
            <Badge key={spec} variant="secondary">
              {spec}
            </Badge>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <img
            src={artist.portfolioImages[0] || "/placeholder.svg"}
            alt="Tattoo example 1"
            className="rounded-md aspect-square object-cover"
          />
          <img
            src={artist.portfolioImages[1] || "/placeholder.svg"}
            alt="Tattoo example 2"
            className="rounded-md aspect-square object-cover"
          />
        </div>
      </CardContent>
      <CardFooter className="p-4">
        <Button asChild className="w-full">
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
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex flex-wrap gap-2 mb-4">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-14" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="aspect-square rounded-md" />
          <Skeleton className="aspect-square rounded-md" />
        </div>
      </CardContent>
      <CardFooter className="p-4">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  )
}
