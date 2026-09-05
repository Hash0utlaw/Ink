"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getRecentlyViewed, type RecentlyViewedArtist } from "@/components/utils/recently-viewed"

export function RecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedArtist[]>([])

  useEffect(() => {
    setItems(getRecentlyViewed())
  }, [])

  if (items.length === 0) return null

  return (
    <section className="py-8 border-t border-border/50">
      <div className="container mx-auto px-4">
        <h2 className="text-sm font-semibold text-muted-foreground mb-4">Recently viewed</h2>
        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          {items.map((artist) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.id}`}
              className="flex items-center gap-2 shrink-0 rounded-full border border-border/50 bg-card pl-1.5 pr-4 py-1.5 hover:border-accent/50 transition-colors"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={artist.avatarUrl || "/placeholder.svg"} alt={artist.name} />
                <AvatarFallback className="text-xs">{artist.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium whitespace-nowrap">{artist.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
