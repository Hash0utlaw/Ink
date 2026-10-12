import { shareImage } from "@/lib/og/share-image"
import { getArtistById } from "@/lib/supabase/artists"

// Share image for artist pages without a photo (pages with one use the photo;
// see generateMetadata in ../page.tsx).
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const artist = await getArtistById(params.id)
  if (!artist) return shareImage({ title: "Find a tattoo artist near you.", line: "Tattoo shops and artists across the U.S." })
  const loc = [artist.location.city, artist.location.state].filter(Boolean).join(", ")
  return shareImage({ title: artist.name, line: loc ? `Tattoo artist in ${loc}` : "Tattoo artist" })
}
