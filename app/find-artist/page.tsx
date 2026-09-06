import type { Metadata } from "next"
import { FindArtistWizard } from "@/components/find-artist/find-artist-wizard"

export const metadata: Metadata = {
  title: "Find Your Perfect Tattoo Artist | TattooMaps",
  description: "Answer 4 quick questions about style, size, budget, and location — we'll match you with the perfect tattoo artist near you on TattooMaps.",
  alternates: { canonical: "/find-artist" },
}

export default function FindArtistPage() {
  return <FindArtistWizard />
}
