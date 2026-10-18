"use client"

import Link from "next/link"
import { X } from "lucide-react"
import type { MapArea, MapAreaArtist } from "@/lib/mapbox"
import { PrivateStudioLabel } from "@/components/brand/private-studio"
import { resultsHref } from "@/components/find-artist/finder-url"
import { formatCount } from "@/lib/format-count"
import { areaLabel } from "./mapbox-map"

const LINK = "font-semibold text-navy underline underline-offset-2 hover:no-underline"
// The finder's smallest radius around the city center for "See all".
const SEE_ALL_RADIUS = 10

interface AreaDetailsProps {
  area: MapArea
  /** Null while loading. */
  artists: MapAreaArtist[] | null
  /** Rows matching (may be more than the list shows). */
  total: number
  error: boolean
  styles: string[]
  onClose: () => void
}

/**
 * The open city circle (Round 11), docked where the selected pin's card goes:
 * who's there, most followed first, and "See all" in the finder. No address
 * and no directions: the circle is the city, not where anyone works.
 */
export function AreaDetails({ area, artists, total, error, styles, onClose }: AreaDetailsProps) {
  const title = areaLabel({ count: total || area.count, city: area.city })
  const near = [area.city, area.state].filter(Boolean).join(", ")
  const seeAll = resultsHref({ near: near || "this area", lat: area.lat, lng: area.lng, r: SEE_ALL_RADIUS, styles })

  return (
    <section
      aria-label={title}
      className="absolute inset-x-2 bottom-[84px] z-20 max-h-[60%] overflow-y-auto rounded border-2 border-ink bg-vellum tex-vellum p-4 scrollbar-ink sm:inset-x-4 lg:bottom-11 lg:left-4 lg:right-auto lg:w-[340px]"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[20px] leading-[1.15] text-ink text-balance">{title}</h2>
          <p className="mt-0.5 text-[13px] text-ink-muted">Studio not listed</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-[15px] text-ink-muted">Couldn&apos;t load this list. Try again in a moment.</p>
      ) : artists === null ? (
        <p className="mt-3 text-[15px] text-ink-muted">Loading...</p>
      ) : (
        <ul className="mt-2">
          {artists.map((a) => (
            <li key={a.id} className="border-t border-rule">
              <Link
                href={`/artists/${a.id}`}
                className="flex min-h-11 items-center justify-between gap-3 py-2 text-[15px] text-ink hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="min-w-0 break-words">{a.name}</span>
                  {a.privateStudio && <PrivateStudioLabel className="text-[13px]" iconClassName="h-3.5 w-3.5" />}
                </span>
                {a.followers != null && a.followers > 0 && (
                  <span className="shrink-0 font-medium tabular-nums text-ink-muted">{formatCount(a.followers)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href={seeAll} className={`mt-2 inline-flex min-h-11 items-center text-sm ${LINK}`}>
        See all {total || area.count}
      </Link>
    </section>
  )
}
