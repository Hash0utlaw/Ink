"use client"

import { useState } from "react"
import type { Artist } from "@/types/artist"
import { ArtistPlateCard, ArtistPlateGrid } from "@/components/artists/artist-plate-card"
import { EmptyBox, ProfileSection } from "@/components/artist-profile/profile-sections"

const INITIAL = 12

/** Best rated first, then A to Z. */
function byRatingThenName(a: Artist, b: Artist) {
  return b.rating - a.rating || a.name.localeCompare(b.name, "en", { sensitivity: "base" })
}

/** The shop's artists as plates: the first 12, then "Show all {n} artists" in place. */
export function ShopArtists({ shopName, artists }: { shopName: string; artists: Artist[] }) {
  const [expanded, setExpanded] = useState(false)
  const sorted = [...artists].sort(byRatingThenName)
  const shown = expanded ? sorted : sorted.slice(0, INITIAL)

  return (
    <ProfileSection
      id="artists"
      title={
        <>
          Artists at {shopName}
          {artists.length > 0 && <span className="ml-2 tabular-nums text-ink-muted">{artists.length}</span>}
        </>
      }
    >
      {artists.length === 0 ? (
        <EmptyBox title="No artists listed yet.">If you work here, claim this shop to add your team.</EmptyBox>
      ) : (
        <>
          <ArtistPlateGrid>
            {shown.map((artist) => (
              <li key={artist.id} className="min-w-0">
                <ArtistPlateCard artist={artist} />
              </li>
            ))}
          </ArtistPlateGrid>
          {sorted.length > shown.length && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-6 min-h-11 text-[15px] font-semibold text-navy underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Show all {sorted.length} artists
            </button>
          )}
        </>
      )}
    </ProfileSection>
  )
}
