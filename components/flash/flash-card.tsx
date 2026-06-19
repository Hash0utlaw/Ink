import Image from "next/image"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import type { FlashListing } from "@/lib/supabase/flash"

function priceLabel(listing: FlashListing) {
  if (listing.priceMax) return `$${listing.price}–$${listing.priceMax}`
  return `$${listing.price}`
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
}

interface FlashCardProps {
  listing: FlashListing
}

export function FlashCard({ listing }: FlashCardProps) {
  const bookHref = `/book/${listing.artistHandle || listing.artistId}?flash=${listing.id}`

  return (
    <div className="group relative flex flex-col rounded-xl overflow-hidden border border-border/50 bg-card hover:border-[#7C3AED]/40 transition-all hover:shadow-lg hover:shadow-[#7C3AED]/10">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={listing.imageUrl}
          alt={listing.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          unoptimized
        />
        {listing.isExclusive && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-[#7C3AED] text-white border-0 gap-1 text-xs shadow-md">
              <Sparkles className="w-3 h-3" />
              Exclusive
            </Badge>
          </div>
        )}
        <div className="absolute bottom-2 left-2">
          <span className="bg-black/70 text-white text-sm font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
            {priceLabel(listing)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3">
        <p className="font-semibold text-sm leading-tight line-clamp-1">{listing.title}</p>

        <div className="flex flex-wrap gap-1">
          {listing.style && (
            <Badge variant="secondary" className="text-xs">{listing.style}</Badge>
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
              <AvatarFallback className="text-[8px] bg-accent/20 text-accent">{initials(listing.artistName)}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">{listing.artistName}</span>
          </Link>

          <Button
            size="sm"
            className="shrink-0 h-7 text-xs bg-[#7C3AED] hover:bg-[#6D28D9] px-2.5"
            asChild
          >
            <Link href={bookHref}>Book</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
