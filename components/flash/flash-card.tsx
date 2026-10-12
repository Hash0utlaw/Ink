import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import type { FlashListing } from "@/lib/supabase/flash"
import { SaveButton } from "@/components/saved/save-button"
import { SafeImage } from "@/components/brand/safe-image"
import { styleLabel } from "@/lib/styles"
import { StyleBadge } from "@/components/brand/style-badge"
import { initials } from "@/lib/initials"

function priceLabel(listing: FlashListing) {
  if (listing.priceMax) return `$${listing.price}–$${listing.priceMax}`
  return `$${listing.price}`
}


interface FlashCardProps {
  listing: FlashListing
  initialSaved?: boolean
}

export function FlashCard({ listing, initialSaved }: FlashCardProps) {
  const bookHref = `/book/${listing.artistHandle || listing.artistId}?flash=${listing.id}`

  return (
    <div className="group relative flex flex-col rounded-lg overflow-hidden border border-border/50 bg-vellum tex-vellum hover:border-ink transition-all">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <SafeImage
          src={listing.imageUrl}
          alt={listing.title}
          name={listing.artistName}
          primaryStyle={listing.style}
          initialsSize={56}
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="transition-transform duration-300"
        />
        <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
          {listing.isExclusive && (
            <Badge className="bg-primary text-primary-foreground border-0 gap-1 text-xs">
              <Sparkles className="w-3 h-3" />
              Exclusive
            </Badge>
          )}
          <SaveButton itemType="artist" itemId={listing.artistId} variant="icon" initialSaved={initialSaved} />
        </div>
        <div className="absolute bottom-2 left-2">
          <span className="bg-black/70 text-white text-sm font-bold px-2 py-0.5 rounded-md">
            {priceLabel(listing)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3">
        <p className="font-semibold text-sm leading-tight line-clamp-1">{listing.title}</p>

        <div className="flex flex-wrap gap-1">
          {listing.style && (
            <StyleBadge slug={listing.style} label={styleLabel(listing.style) ?? listing.style} className="text-xs" />
          )}
          {listing.size && (
            <Badge variant="outline" className="text-xs">{listing.size}</Badge>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-1">
          <Link
            href={`/artists/${listing.artistId}`}
            className="flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity"
          >
            <Avatar className="w-5 h-5 shrink-0">
              <AvatarImage src={listing.artistAvatar} alt={listing.artistName} />
              <AvatarFallback className="text-[8px] bg-vellum text-ink font-heading border-1.5 border-ink">{initials(listing.artistName)}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">{listing.artistName}</span>
          </Link>

          <Button
            size="sm"
            className="shrink-0 h-7 text-xs bg-primary hover:bg-primary/90 px-2.5"
            asChild
          >
            <Link href={bookHref}>Book</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
