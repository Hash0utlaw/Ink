import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Heart, Share2, Instagram, Globe } from "lucide-react"
import type { Artist } from "@/types/artist"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")
}

export function ArtistHeader({ artist }: { artist: Artist }) {
  const igHandle = artist.instagramHandle?.replace(/^@/, "").trim()
  const websiteUrl = artist.websiteUrl?.trim()

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
      <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-accent shrink-0">
        <AvatarImage src={artist.avatarUrl || ""} alt={artist.name} />
        <AvatarFallback className="text-4xl font-bold bg-accent/10 text-accent">
          {initials(artist.name) || "?"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{artist.name}</h1>

        {artist.shopName && (
          <p className="text-lg text-muted-foreground mt-1">at {artist.shopName}</p>
        )}

        {(artist.rating > 0 || artist.isAvailable) && (
          <div className="flex items-center gap-4 mt-2">
            {artist.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="text-lg font-bold">{artist.rating}</span>
                <span className="text-sm text-muted-foreground">({artist.reviewCount} reviews)</span>
              </div>
            )}
            {artist.isAvailable && (
              <Badge variant="outline" className="border-green-400 text-green-400">
                Available for booking
              </Badge>
            )}
          </div>
        )}

        {artist.specialties.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {artist.specialties.map((spec) => (
              <Badge key={spec} variant="secondary">
                {spec}
              </Badge>
            ))}
          </div>
        )}

        {(igHandle || websiteUrl) && (
          <div className="mt-3 flex flex-wrap gap-3">
            {igHandle && (
              <a
                href={`https://instagram.com/${igHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Instagram className="w-4 h-4" />
                @{igHandle}
              </a>
            )}
            {websiteUrl && (
              <a
                href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Globe className="w-4 h-4" />
                Website
              </a>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 shrink-0">
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
