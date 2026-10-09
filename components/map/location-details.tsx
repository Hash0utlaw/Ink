"use client"

import Link from "next/link"
import { Share2, X } from "lucide-react"
import type { MapboxLocation } from "@/lib/mapbox"
import { styleEntries } from "@/lib/styles"
import { StyleBadge } from "@/components/brand/style-badge"
import { MapPin } from "@/components/brand/map-pin"
import { useToast } from "@/components/ui/use-toast"

interface LocationDetailsProps {
  location: MapboxLocation
  /** The location's list/pin number, if it has one. */
  pinNumber?: number
  onClose: () => void
}

function ratingLine(rating: number, reviewCount: number) {
  if (rating <= 0) return "No reviews yet"
  const reviews = `${reviewCount.toLocaleString("en-US")} ${reviewCount === 1 ? "review" : "reviews"}`
  return reviewCount > 0 ? `Rated ${rating.toFixed(1)} from ${reviews}` : `Rated ${rating.toFixed(1)}`
}

// "shop-<uuid>" → "/shops/<uuid>", "artist-<uuid>" → "/artists/<uuid>"
function profileHref(location: MapboxLocation) {
  const raw = location.id.slice(location.id.indexOf("-") + 1)
  return location.type === "shop" ? `/shops/${raw}` : `/artists/${raw}`
}

const LINK = "font-semibold text-navy underline underline-offset-2 hover:no-underline"

/** The selected pin's card, docked bottom-left of the map (full width at the bottom on mobile). */
export function LocationDetails({ location, pinNumber, onClose }: LocationDetailsProps) {
  const { toast } = useToast()
  const [lng, lat] = location.coordinates
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  const badges = styleEntries(location.styles).slice(0, 3)
  const hours = Object.entries(location.hours ?? {})

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: location.name,
          text: `Check out ${location.name} on TattooMaps`,
          url: window.location.href,
        })
      } catch (error) {
        console.log("Error sharing:", error)
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      toast({ description: "Link copied" })
    }
  }

  return (
    <section
      aria-label={`Selected: ${location.name}`}
      className="absolute inset-x-2 bottom-[84px] z-20 max-h-[60%] overflow-y-auto rounded-lg border-2 border-ink bg-vellum p-4 scrollbar-ink sm:inset-x-4 lg:bottom-11 lg:left-4 lg:right-auto lg:w-[380px]"
    >
      <div className="flex items-start gap-3">
        <MapPin number={pinNumber ?? ""} selected className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[22px] leading-[1.15] text-ink text-balance">{location.name}</h2>
          {location.type === "artist" && <p className="text-[13px] text-ink-muted">Artist</p>}
        </div>
        <div className="-mr-2 -mt-2 flex shrink-0">
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Share2 className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {location.address && <p className="mt-2 text-[15px] text-ink">{location.address}</p>}
      <p className="mt-1 text-[15px] tabular-nums text-ink-muted">
        {ratingLine(location.rating, location.reviewCount)}
        {location.distance != null &&
          `, ${location.distance < 1 ? `${(location.distance * 5280).toFixed(0)} ft` : `${location.distance.toFixed(1)} mi`} away`}
        {location.isOpen && <span className="font-semibold text-bottle-green">. Walk-ins welcome</span>}
      </p>

      {badges.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {badges.map(({ slug, label }) => (
            <StyleBadge key={slug} slug={slug} label={label} />
          ))}
        </div>
      )}

      {location.description && (
        <p className="mt-3 line-clamp-3 text-pretty text-[15px] leading-[1.55] text-ink">{location.description}</p>
      )}

      {hours.length > 0 && (
        <details className="mt-3 text-[15px] text-ink">
          <summary className="cursor-pointer font-semibold">Hours</summary>
          <dl className="mt-2 space-y-1">
            {hours.map(([day, value]) => (
              <div key={day} className="flex justify-between gap-4">
                <dt className="capitalize">{day}</dt>
                <dd className="text-ink-muted">{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
        <Link href={profileHref(location)} className={LINK}>
          {location.type === "shop" ? "View shop" : "View artist"}
        </Link>
        <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
          Get directions
        </a>
        {location.website && (
          <a href={location.website} target="_blank" rel="noopener noreferrer" className={LINK}>
            Website
          </a>
        )}
      </div>
    </section>
  )
}
