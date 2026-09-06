import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Star, MapPin, ArrowRight, Car } from "lucide-react"
import type { Artist } from "@/types/artist"

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
}

interface WorthTheDriveProps {
  artists: Artist[]
}

export function WorthTheDrive({ artists }: WorthTheDriveProps) {
  if (artists.length === 0) return null

  return (
    <section className="py-12 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-[#7C3AED]" />
            <div>
              <h2 className="text-2xl font-extrabold">Worth the Drive</h2>
              <p className="text-sm text-muted-foreground">Top-rated artists across the US — wherever they are</p>
            </div>
          </div>
          <Link href="/artists?sortBy=rating" className="flex items-center gap-1 text-sm text-[#7C3AED] hover:underline">
            See all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {artists.map((artist) => {
            const loc = [artist.location.city, artist.location.state].filter(Boolean).join(", ")
            return (
              <Link
                key={artist.id}
                href={`/artists/${artist.id}`}
                className="group flex gap-3 p-4 rounded-xl border border-border/50 bg-card hover:border-[#7C3AED]/40 hover:shadow-md transition-all"
              >
                <Avatar className="w-14 h-14 shrink-0 border-2 border-accent/40">
                  <AvatarImage src={artist.avatarUrl} alt={artist.name} />
                  <AvatarFallback className="font-bold bg-accent/10 text-accent">
                    {initials(artist.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm leading-tight truncate">{artist.name}</p>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-bold">{artist.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  {artist.shopName && (
                    <p className="text-xs text-muted-foreground truncate">at {artist.shopName}</p>
                  )}

                  {loc && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />{loc}
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    <span className="text-xs text-muted-foreground">({artist.reviewCount} reviews)</span>
                    {artist.specialties.slice(0, 2).map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function WorthTheDriveSkeleton() {
  return (
    <section className="py-12 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-6">
          <Car className="w-5 h-5 text-[#7C3AED]" />
          <div className="h-7 w-44 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  )
}
