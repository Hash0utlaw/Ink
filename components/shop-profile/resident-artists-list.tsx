import { ArtistCard } from "@/components/artists/artist-card"
import type { Artist } from "@/types/artist"

export function ResidentArtistsList({ artists }: { artists: Artist[] }) {
  if (artists.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold">No Resident Artists Listed</h3>
        <p className="text-muted-foreground mt-2">Check back later for updates.</p>
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
