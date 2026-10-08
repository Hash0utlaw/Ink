"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plate } from "@/components/brand/plate"
import { StyleBadge } from "@/components/brand/style-badge"
import type { Artist } from "@/types/artist"
import { styleEntries } from "@/lib/styles"
import { safeImageSrc } from "@/lib/utils/safe-image"
import { clearHomeLocation, readHomeLocation } from "./home-location"

function photoOrNull(url: string): string | null {
  const src = safeImageSrc(url)
  return src === "/placeholder.svg" ? null : src
}

function ArtistPlateCard({ artist }: { artist: Artist }) {
  const { city, state } = artist.location
  const badges = styleEntries(artist.styles).slice(0, 2)
  return (
    <li>
      <Link href={`/artists/${artist.id}`} className="group block">
        <Plate
          fluid
          sizes="(min-width: 1024px) 200px, (min-width: 768px) 30vw, 45vw"
          src={photoOrNull(artist.avatarUrl)}
          alt={artist.name}
          name={artist.name}
          primaryStyle={artist.styles[0]}
        />
        <h3 className="mt-3 font-heading text-[20px] leading-tight text-ink group-hover:underline">{artist.name}</h3>
        {(artist.shopName || city) && (
          <p className="mt-1 text-sm text-ink-muted">
            {artist.shopName}
            {artist.shopName && city ? ", " : ""}
            {city && <span className="font-place italic">{city}</span>}
            {city && state ? `, ${state}` : ""}
          </p>
        )}
        {badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {badges.map(({ slug, label }) => (
              <StyleBadge key={slug} slug={slug} label={label} />
            ))}
          </div>
        )}
      </Link>
    </li>
  )
}

interface Nearby {
  city: string
  artists: Artist[]
}

export function TopArtists({ artists }: { artists: Artist[] }) {
  const [nearby, setNearby] = useState<Nearby | null>(null)

  // Only when this session already used "Use my location" on the homepage; never prompts.
  useEffect(() => {
    const loc = readHomeLocation()
    if (!loc) return
    let cancelled = false
    fetch(`/api/artists/nearby?lat=${loc.lat}&lng=${loc.lng}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { data?: Artist[] } | null) => {
        const list = (json?.data ?? []).slice(0, 6)
        const city = list[0]?.location.city
        if (!cancelled && list.length > 0 && city) setNearby({ city, artists: list })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  function changeLocation() {
    clearHomeLocation()
    setNearby(null)
    document.getElementById("hero-where")?.focus()
  }

  const shown = nearby?.artists ?? artists
  if (shown.length === 0) return null

  return (
    <section aria-labelledby="top-artists-heading" className="mx-auto w-full max-w-[1344px] px-6">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="top-artists-heading" className="text-[30px] leading-[1.15] text-ink md:text-[34px]">
          {nearby ? (
            <>
              Artists near <span className="font-place italic">{nearby.city}</span>
            </>
          ) : (
            "Top-rated artists"
          )}
        </h2>
        {nearby ? (
          <button type="button" onClick={changeLocation} className="font-semibold text-navy underline underline-offset-2 hover:no-underline">
            Change location
          </button>
        ) : (
          <Link href="/artists" className="font-semibold text-navy underline underline-offset-2 hover:no-underline">
            See all artists
          </Link>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-6">
        {shown.map((artist) => (
          <ArtistPlateCard key={artist.id} artist={artist} />
        ))}
      </ul>
    </section>
  )
}
