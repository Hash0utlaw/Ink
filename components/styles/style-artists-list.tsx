"use client"

import type { Artist } from "@/types/artist"
import { ArtistCard } from "@/components/artists/artist-card"
import { MotionView } from "@/components/utils/motion-view"

interface StyleArtistsListProps {
  artists: Artist[]
}

export function StyleArtistsList({ artists }: StyleArtistsListProps) {
  if (artists.length === 0) {
    return (
      <MotionView className="text-center py-12">
        <h3 className="text-2xl font-semibold text-foreground mb-4">No Artists Found</h3>
        <p className="text-muted-foreground">
          We're currently expanding our network of artists specializing in this style. Check back soon for updates!
        </p>
      </MotionView>
    )
  }

  return (
    <div className="space-y-8">
      <MotionView>
        <h2 className="text-3xl font-bold text-foreground mb-6">Featured Artists</h2>
        <p className="text-muted-foreground mb-8">
          Discover talented artists who specialize in this style and bring your vision to life.
        </p>
      </MotionView>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {artists.map((artist, index) => (
          <MotionView key={artist.id} delay={index * 0.1}>
            <ArtistCard artist={artist} />
          </MotionView>
        ))}
      </div>
    </div>
  )
}
