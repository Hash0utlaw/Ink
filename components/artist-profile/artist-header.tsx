import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Heart, Share2 } from "lucide-react"
import type { Artist } from "@/types/artist"

export function ArtistHeader({ artist }: { artist: Artist }) {
  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
      <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-accent">
        <AvatarImage src={artist.avatarUrl || "/placeholder.svg"} alt={artist.name} />
        <AvatarFallback className="text-4xl">{artist.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{artist.name}</h1>
        <p className="text-lg text-muted-foreground mt-1">at {artist.shopName}</p>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="text-lg font-bold">{artist.rating}</span>
            <span className="text-sm text-muted-foreground">({artist.reviewCount} reviews)</span>
          </div>
          {artist.isAvailable && (
            <Badge variant="outline" className="border-green-400 text-green-400">
              Available for booking
            </Badge>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {artist.specialties.map((spec) => (
            <Badge key={spec} variant="secondary">
              {spec}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="icon">
          <Heart className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon">
          <Share2 className="h-4 w-4" />
        </Button>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Book Now</Button>
      </div>
    </div>
  )
}
