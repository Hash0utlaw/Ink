import { ArtistCard, ArtistCardSkeleton } from "./artist-card"
import type { Artist } from "@/types/artist"

interface ResultsListProps {
  artists: Artist[]
  isLoading: boolean
}

export function ResultsList({ artists, isLoading }: ResultsListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <ArtistCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (artists.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold">No Artists Found</h3>
        <p className="text-muted-foreground mt-2">Try adjusting your filters to find more results.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {artists.map((artist) => (
        <ArtistCard key={artist.id} artist={artist} />
      ))}
    </div>
  )
}
