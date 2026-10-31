import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Star, MapPin, Clock, Tag } from "lucide-react"
import type { Artist } from "@/types/artist"
import { cardBookingLine } from "@/lib/profile-details"
import { SaveButton } from "@/components/saved/save-button"
import { allowedImageSrc } from "@/lib/utils/safe-image"
import { SafeImage } from "@/components/brand/safe-image"
import { styleEntries } from "@/lib/styles"
import { StyleBadge } from "@/components/brand/style-badge"
import { initials } from "@/lib/initials"

interface ArtistCardProps {
  artist: Artist
  distance?: number
  initialSaved?: boolean
}


export function ArtistCard({ artist, distance, initialSaved }: ArtistCardProps) {
  const hasRating = artist.rating > 0
  const locationLine = [artist.location.city, artist.location.state].filter(Boolean).join(", ")
  // Round 12: "Taking new clients" or "Waitlist" once the artist has set it; replaces the old availability badge.
  const booking = cardBookingLine(artist)
  const previews = artist.previewImages.filter((url) => allowedImageSrc(url))
  const hasPreview = previews.length > 0

  return (
    <Card className="relative overflow-hidden transition-all hover:border-ink flex flex-col">
      {/* Stub artists (shop_artists rows) have no profile, so nothing to save or link to. */}
      {!artist.isStub && (
        <SaveButton
          itemType="artist"
          itemId={artist.id}
          variant="icon"
          initialSaved={initialSaved}
          className="absolute top-3 right-3 z-10"
        />
      )}
      {/* Portfolio strip */}
      {hasPreview && (
        <div className="grid grid-cols-3 h-24 overflow-hidden">
          {previews.slice(0, 3).map((url, i) => (
            <div key={i} className="relative overflow-hidden bg-muted">
              <SafeImage src={url} alt={`${artist.name} portfolio ${i + 1}`} name={artist.name} showInitials={false} sizes="120px" />
            </div>
          ))}
        </div>
      )}

      <CardHeader className="flex flex-row items-start gap-4 p-4">
        <Avatar className="w-14 h-14 border-2 border-ink shrink-0">
          <AvatarImage src={artist.avatarUrl || ""} alt={artist.name} />
          <AvatarFallback className="text-lg bg-vellum text-ink font-heading border-1.5 border-ink">
            {initials(artist.name) || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* pr-12 keeps the name and distance clear of the save button (top-right). */}
          <div className={`flex items-start justify-between gap-2 ${artist.isStub ? "" : "pr-12"}`}>
            <h3 className="font-bold text-base leading-tight truncate">{artist.name}</h3>
            {distance != null && (
              <span className="text-xs px-2 py-0.5 rounded bg-warning text-warning-foreground border border-warning whitespace-nowrap shrink-0">
                {distance.toFixed(1)} mi
              </span>
            )}
          </div>

          {artist.shopName && (
            <p className="text-xs text-muted-foreground truncate">{artist.shopName}</p>
          )}

          {locationLine && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{locationLine}</span>
            </div>
          )}

          {hasRating && (
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="w-3.5 h-3.5 text-flash-yellow fill-flash-yellow" />
              <span className="text-sm font-medium">{artist.rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({artist.reviewCount})</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-1 space-y-2">
        {/* Availability + response time */}
        <div className="flex items-center gap-3 flex-wrap">
          {booking && (
            <span className={`text-xs font-semibold ${booking === "Waitlist" ? "text-ink" : "text-bottle-green"}`}>{booking}</span>
          )}
          {artist.avgResponseHours != null && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Replies in ~{artist.avgResponseHours < 24
                ? `${artist.avgResponseHours}h`
                : `${Math.round(artist.avgResponseHours / 24)}d`}
            </span>
          )}
        </div>

        {/* Discount badge (Pro only) */}
        {artist.firstBookingDiscount != null && artist.firstBookingDiscount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border border-warning text-warning-foreground bg-warning">
            <Tag className="w-3 h-3" />
            {artist.firstBookingDiscount}% off first session
          </span>
        )}

        {artist.styles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {styleEntries(artist.styles).slice(0, 2).map(({ slug, label }) => (
              <StyleBadge key={slug} slug={slug} label={label} className="text-xs" />
            ))}
            {artist.styles.length > 2 && (
              <Badge variant="secondary" className="text-xs">+{artist.styles.length - 2}</Badge>
            )}
          </div>
        )}
      </CardContent>

      {!artist.isStub && (
        <CardFooter className="p-4 pt-0">
          <Button asChild className="flex-1">
            <Link href={`/artists/${artist.id}`}>View Profile</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

export function ArtistCardSkeleton() {
  return (
    <Card>
      <div className="h-24 bg-muted animate-pulse" />
      <CardHeader className="flex flex-row items-start gap-4 p-4">
        <Skeleton className="w-14 h-14 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3.5 w-1/3" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <Skeleton className="h-5 w-32 rounded" />
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-5 w-14 rounded" />
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  )
}
