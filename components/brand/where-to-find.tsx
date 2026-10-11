import Link from "next/link"
import { staticMapUrl } from "@/lib/mapbox"
import { NeatlineFrame } from "./neatline-frame"

const OUTLINE_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-lg border-1.5 border-ink px-4 text-[15px] font-semibold text-ink hover:bg-vellum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

/** "35.247° N, 80.806° W" */
function formatCoordinates([lng, lat]: [number, number]) {
  return `${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(3)}° ${lng >= 0 ? "E" : "W"}`
}

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

/** Hours in weekday order (jsonb keeps keys alphabetical); unknown keys go last, blanks are dropped. */
function orderedHours(hours: Record<string, string>) {
  const rank = (day: string) => {
    const i = WEEKDAYS.indexOf(day.toLowerCase())
    return i === -1 ? WEEKDAYS.length : i
  }
  return Object.entries(hours)
    .filter(([, value]) => String(value ?? "").trim())
    .sort(([a], [b]) => rank(a) - rank(b))
}

export interface WhereToFindPanelProps {
  /** [lng, lat], or null when the place has no coordinates. */
  coordinates: [number, number] | null
  /** Formatted address (lib/format-address.ts); empty when unknown. */
  address: string
  /** Alt text for the map, e.g. "Map showing Black Cloud Tattoo in Charlotte". */
  mapLabel: string
  /** Artist pages: the shop they work at. */
  shop?: { name: string; href: string }
  /** Artist pages: "City, State". */
  place?: string
  /** Shop pages: active artists. */
  artistCount?: number
  rating?: number
  reviewCount?: number
  hours?: Record<string, string>
}

/** True when there's enough to show the panel: an address or coordinates. */
export function hasWhereToFind({ address, coordinates }: Pick<WhereToFindPanelProps, "address" | "coordinates">) {
  return Boolean(address.trim() || coordinates)
}

/**
 * The profile header's "Where to find" panel, in the page's one striped frame:
 * a static chart with a red pin (only with coordinates), then only the lines that
 * have real data, and "Get directions". Renders nothing without an address or coordinates.
 */
export function WhereToFindPanel({
  coordinates,
  address,
  mapLabel,
  shop,
  place,
  artistCount,
  rating = 0,
  reviewCount = 0,
  hours,
}: WhereToFindPanelProps) {
  if (!hasWhereToFind({ address, coordinates })) return null

  const hourRows = hours ? orderedHours(hours) : []
  const destination = coordinates ? `${coordinates[1]},${coordinates[0]}` : address
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`

  return (
    // Textured paper, opaque: on desktop the panel overlaps the cover strip.
    <NeatlineFrame className="bg-paper tex-paper">
      <section
        aria-labelledby="where-to-find-heading"
        className="bg-paper tex-paper p-4 text-[15px] leading-[1.55] text-ink lg:p-5"
      >
        <h2 id="where-to-find-heading" className="font-heading text-[22px] leading-[1.15] text-balance">
          Where to find
        </h2>

        {coordinates && (
          <div className="relative mt-3 aspect-video overflow-hidden rounded border border-ink bg-chart-land">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={staticMapUrl(coordinates, { width: 640, height: 360 })}
              alt={mapLabel}
              width={640}
              height={360}
              loading="lazy"
              decoding="async"
              className="block h-full w-full object-cover"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[34px] w-[34px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-flash-red"
            />
          </div>
        )}

        <div className="mt-4 space-y-1">
          {shop && (
            <p className="font-heading text-[19px] leading-[1.2]">
              <Link href={shop.href} className="text-navy underline underline-offset-2 hover:no-underline">
                {shop.name}
              </Link>
            </p>
          )}
          {address && <p>{address}</p>}
          {coordinates && (
            <p className="font-place text-base italic text-ink-muted">{formatCoordinates(coordinates)}</p>
          )}
          {place && <p className="font-place text-base italic text-ink-muted">{place}</p>}
          {artistCount != null && artistCount > 0 && (
            <p className="tabular-nums text-ink-muted">
              {artistCount} {artistCount === 1 ? "artist" : "artists"}
            </p>
          )}
          {reviewCount > 0 && rating > 0 && (
            <p className="tabular-nums text-ink-muted">
              Rated {rating.toFixed(1)} from {reviewCount.toLocaleString("en-US")}{" "}
              {reviewCount === 1 ? "review" : "reviews"}
            </p>
          )}
        </div>

        {hourRows.length > 0 && (
          <dl className="mt-4 border-t border-rule text-sm">
            {hourRows.map(([day, value]) => (
              <div key={day} className="flex justify-between gap-4 border-b border-rule py-1.5">
                <dt className="capitalize">{day}</dt>
                <dd className="text-right text-ink-muted">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <a href={directions} target="_blank" rel="noopener noreferrer" className={`mt-4 w-full ${OUTLINE_BUTTON}`}>
          Get directions
        </a>
      </section>
    </NeatlineFrame>
  )
}
