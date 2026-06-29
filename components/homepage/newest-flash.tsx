import Link from "next/link"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Zap, ArrowRight } from "lucide-react"
import type { FlashListing } from "@/lib/supabase/flash"

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
}

interface NewestFlashProps {
  listings: FlashListing[]
}

export function NewestFlash({ listings }: NewestFlashProps) {
  if (listings.length === 0) return null

  return (
    <section className="py-12 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#7C3AED]" />
            <h2 className="text-2xl font-extrabold">Newest Flash</h2>
          </div>
          <Link
            href="/flash"
            className="flex items-center gap-1 text-sm text-[#7C3AED] hover:underline"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none -mx-4 px-4">
          {listings.map((listing) => {
            const bookHref = `/book/${listing.artistHandle || listing.artistId}?flash=${listing.id}`
            return (
              <Link
                key={listing.id}
                href={bookHref}
                className="group shrink-0 w-48 flex flex-col rounded-xl overflow-hidden border border-border/50 bg-card hover:border-[#7C3AED]/40 transition-all hover:shadow-lg hover:shadow-[#7C3AED]/10"
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <Image
                    src={listing.imageUrl}
                    alt={listing.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {listing.isExclusive && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-[#7C3AED] text-white border-0 gap-1 text-xs">
                        <Sparkles className="w-2.5 h-2.5" />
                        Excl.
                      </Badge>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2">
                    <span className="bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                      ${listing.price}{listing.priceMax ? `–$${listing.priceMax}` : ""}
                    </span>
                  </div>
                </div>
                <div className="p-2.5 space-y-1.5">
                  <p className="text-xs font-semibold line-clamp-1">{listing.title}</p>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="w-4 h-4 shrink-0">
                      <AvatarImage src={listing.artistAvatar} alt={listing.artistName} />
                      <AvatarFallback className="text-[8px]">{initials(listing.artistName)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground truncate">{listing.artistName}</span>
                  </div>
                  {listing.style && (
                    <Badge variant="secondary" className="text-xs">{listing.style}</Badge>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function NewestFlashSkeleton() {
  return (
    <section className="py-12 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="w-5 h-5 text-[#7C3AED]" />
          <div className="h-7 w-36 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-48 rounded-xl bg-muted animate-pulse aspect-[3/4]" />
          ))}
        </div>
      </div>
    </section>
  )
}
