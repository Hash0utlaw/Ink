import { ArtistCard } from "@/components/artists/artist-card"
import { MotionView } from "@/components/utils/motion-view"
import type { Artist } from "@/types/artist"

interface StyleArtistsListProps {
  artists: Artist[]
}

export function StyleArtistsList({ artists }: StyleArtistsListProps) {
  return (
    <div>
      <MotionView>
        <h2 className="text-3xl font-bold text-center mb-12">Artists Specializing in this Style</h2>
      </MotionView>
      {artists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {artists.map((artist) => (
            <MotionView key={artist.id}>
              <ArtistCard artist={artist} />
            </MotionView>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No artists currently listed for this style. Check back soon!</p>
        </div>
      )}
    </div>
  )
}
