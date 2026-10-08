import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Star, MapPin, Clock, Tag } from "lucide-react"
import type { Artist, AvailabilityStatus, PriceTier } from "@/types/artist"
import { SaveButton } from "@/components/saved/save-button"
import { safeImageSrc } from "@/lib/utils/safe-image"
import { styleEntries } from "@/lib/styles"
import { StyleBadge } from "@/components/brand/style-badge"
import { initials } from "@/lib/initials"

interface ArtistCardProps {
  artist: Artist
  distance?: number
  initialSaved?: boolean
}


const AVAILABILITY_CONFIG: Record<AvailabilityStatus, { dot: string; label: string; badge: string }> = {
  available:             { dot: "bg-success",  label: "Available now",       badge: "border-success text-success-foreground bg-success" },
  next_week:             { dot: "bg-warning",  label: "Available next week", badge: "border-warning text-warning-foreground bg-warning" },
  one_to_two_months:     { dot: "bg-warning",  label: "Booked 1–2 months",  badge: "border-warning text-warning-foreground bg-warning" },
  not_taking_clients:    { dot: "bg-muted-foreground",   label: "Not taking clients",  badge: "border-border text-muted-foreground bg-muted" },
}

const PRICE_TIER_LABEL: Record<PriceTier, string> = {
  budget:  "$",
  mid:     "$$",
  premium: "$$$",
  luxury:  "$$$$",
}

export function ArtistCard({ artist, distance, initialSaved }: ArtistCardProps) {
  const hasRating = artist.rating > 0
  const locationLine = [artist.location.city, artist.location.state].filter(Boolean).join(", ")
  const avail = AVAILABILITY_CONFIG[artist.availabilityStatus] ?? AVAILABILITY_CONFIG.available
  const hasPreview = artist.previewImages.length > 0

  return (
    <Card className="relative overflow-hidden transition-all hover:border-ink flex flex-col">
      <SaveButton
        itemType="artist"
        itemId={artist.id}
        variant="icon"
        initialSaved={initialSaved}
        className="absolute top-3 right-3 z-10"
      />
      {/* Portfolio strip */}
      {hasPreview && (
        <div className="grid grid-cols-3 h-24 overflow-hidden">
          {artist.previewImages.slice(0, 3).map((url, i) => (
            <div key={i} className="relative overflow-hidden bg-muted">
              <Image
                src={safeImageSrc(url)}
                alt={`${artist.name} portfolio ${i + 1}`}
                fill
                className="object-cover"
              />
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
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base leading-tight truncate">{artist.name}</h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {distance != null && (
                <span className="text-xs px-2 py-0.5 rounded-lg bg-warning text-warning-foreground border border-warning whitespace-nowrap">
                  {distance.toFixed(1)} mi
                </span>
              )}
              <span className="text-xs font-semibold text-muted-foreground">{PRICE_TIER_LABEL[artist.priceTier]}</span>
            </div>
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
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-lg border ${avail.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />
            {avail.label}
          </span>
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
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg border border-warning text-warning-foreground bg-warning">
            <Tag className="w-3 h-3" />
            {artist.firstBookingDiscount}% off first session
          </span>
        )}

        {artist.styles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {styleEntries(artist.styles).slice(0, 4).map(({ slug, label }) => (
              <StyleBadge key={slug} slug={slug} label={label} className="text-xs" />
            ))}
            {artist.styles.length > 4 && (
              <Badge variant="secondary" className="text-xs">+{artist.styles.length - 4}</Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
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
        <Skeleton className="h-5 w-32 rounded-lg" />
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-16 rounded-lg" />
          <Skeleton className="h-5 w-20 rounded-lg" />
          <Skeleton className="h-5 w-14 rounded-lg" />
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  )
}
