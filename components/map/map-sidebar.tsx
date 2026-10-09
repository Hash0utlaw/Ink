"use client"

import type React from "react"
import { useState } from "react"
import { Loader2, LocateFixed, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MapPin } from "@/components/brand/map-pin"
import { StyleBadge } from "@/components/brand/style-badge"
import { Plate } from "@/components/brand/plate"
import { MapFilters } from "./map-filters"
import { locationKindLabel, type MapboxLocation } from "@/lib/mapbox"
import { styleEntries } from "@/lib/styles"
import { cn } from "@/lib/utils"

const MAX_CARDS = 100

interface MapSidebarProps {
  isOpen: boolean
  onToggle: () => void
  /** Already sorted best rated first and capped at MAX_CARDS (map-interface.tsx). */
  locations: MapboxLocation[]
  /** Location id → number shown on the row and on its map pin. */
  pinNumbers: Map<string, number>
  /** The searched place, when the search geocoded to one. */
  place: string | null
  // Shop/artist pins currently in view (after filters); falls back to locations.length.
  totals?: { shops: number; artists: number } | null
  selectedLocation: MapboxLocation | null
  onLocationSelect: (location: MapboxLocation) => void
  filters: any
  onFilterChange: (filters: any) => void
  onSearch: (query: string) => void
  onCurrentLocation: () => void
  loading: boolean
  dataError?: string | null
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`

function ratingLine(rating: number, reviewCount: number) {
  if (rating <= 0) return "No reviews yet"
  return reviewCount > 0
    ? `Rated ${rating.toFixed(1)} from ${plural(reviewCount, "review", "reviews")}`
    : `Rated ${rating.toFixed(1)}`
}

const SECONDARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-1.5 border-ink bg-vellum px-3 text-[15px] font-semibold text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function MapSidebar({
  isOpen,
  onToggle,
  locations,
  pinNumbers,
  place,
  totals,
  selectedLocation,
  onLocationSelect,
  filters,
  onFilterChange,
  onSearch,
  onCurrentLocation,
  loading,
  dataError,
}: MapSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchQuery)
  }

  // [count, noun] pairs for the count line, e.g. "1,240 shops and 310 artists".
  const countParts: [number, string, string][] = totals
    ? ([
        filters.locationType !== "artist" ? [totals.shops, "shop", "shops"] : null,
        filters.locationType !== "shop" ? [totals.artists, "artist", "artists"] : null,
      ].filter(Boolean) as [number, string, string][])
    : [[locations.length, "shop", "shops"]]

  const inViewTotal = countParts.reduce((sum, [n]) => sum + n, 0)
  const countText = countParts.map(([n, one, many]) => plural(n, one, many)).join(" and ")

  const activeFilterCount =
    (filters.locationType !== "all" ? 1 : 0) +
    filters.styles.length +
    filters.priceRange.length +
    (filters.rating > 0 ? 1 : 0) +
    (filters.availableNow ? 1 : 0)

  return (
    /*
      Mobile: an overlay that floats on top of the map (fixed, taken out of
      flex flow entirely) so the map is always full-width underneath it.
      md+: rejoins the flex row as a fixed 420px side panel.
    */
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-paper transition-all duration-300 ease-out",
        "fixed inset-y-0 left-0 z-40 md:relative md:inset-auto md:z-30",
        isOpen ? "w-full max-w-[420px] border-r-1.5 border-ink opacity-100 md:w-[420px]" : "pointer-events-none w-0 opacity-0"
      )}
    >
      <div className="shrink-0 px-4 pb-4 pt-5 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-heading text-[26px] leading-[1.15] text-ink text-balance">
            {place ? (
              <>
                Tattoo shops near <span className="font-place italic">{place}</span>
              </>
            ) : (
              "Tattoo shops on the map"
            )}
          </h1>
          {/* Mobile only: the open list covers the map. */}
          <button type="button" onClick={onToggle} className={cn(SECONDARY_BUTTON, "shrink-0 md:hidden")}>
            Show map
          </button>
        </div>

        <form onSubmit={handleSearch} className="mt-4">
          <label htmlFor="map-search" className="mb-1.5 block text-[15px] font-semibold text-ink">
            Search by place or name
          </label>
          <div className="flex gap-2">
            <Input
              id="map-search"
              type="text"
              placeholder="City, ZIP or shop name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 flex-1 border-1.5 border-ink bg-white text-base"
            />
            <button
              type="submit"
              className="min-h-11 rounded-lg border-1.5 border-ink bg-flash-red px-4 text-[15px] font-semibold text-white hover:bg-flash-red/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onCurrentLocation} className={SECONDARY_BUTTON}>
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            Use my location
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            className={cn(SECONDARY_BUTTON, showFilters && "bg-ink text-vellum hover:bg-ink")}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {activeFilterCount > 0 && <span className="tabular-nums">({activeFilterCount})</span>}
          </button>
          {(filters.searchQuery || place) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                onSearch("")
              }}
              className="min-h-11 px-1 text-[15px] font-semibold text-navy underline underline-offset-2 hover:no-underline"
            >
              Clear search
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 max-h-[45vh] overflow-y-auto border-t border-rule pt-4 scrollbar-ink">
            <MapFilters filters={filters} onFilterChange={onFilterChange} />
          </div>
        )}

        <div className="mt-4 text-[15px] text-ink-muted">
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading...
            </span>
          ) : (
            <p className="tabular-nums text-pretty">
              {countText} {totals ? "on this part of the map." : "found."}
              {totals && inViewTotal > MAX_CARDS && " Zoom in to see more."}
            </p>
          )}
          {dataError && <p className="mt-1 text-flash-red">{dataError}</p>}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 scrollbar-ink">
        <div className="px-4 pb-6 sm:px-6">
          {loading ? (
            <ul className="border-t border-rule">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="animate-pulse space-y-2 border-b border-rule py-5">
                  <div className="h-5 w-3/4 rounded-lg bg-muted" />
                  <div className="h-4 w-1/2 rounded-lg bg-muted" />
                  <div className="h-4 w-2/3 rounded-lg bg-muted" />
                </li>
              ))}
            </ul>
          ) : locations.length === 0 ? (
            !dataError && (
              <div className="rounded-lg border-1.5 border-ink bg-vellum p-4">
                <p className="font-semibold text-ink">No shops on this part of the map</p>
                <p className="mt-1 text-[15px] text-ink-muted">
                  Zoom out, move the map, or clear some filters to see more.
                </p>
              </div>
            )
          ) : (
            <ul className="border-t border-rule">
              {locations.map((location) => {
                const number = pinNumbers.get(location.id)
                const selected = selectedLocation?.id === location.id
                const badges = styleEntries(location.styles).slice(0, 3)
                return (
                  <li key={location.id} className="border-b border-rule">
                    <button
                      type="button"
                      onClick={() => onLocationSelect(location)}
                      aria-current={selected ? "true" : undefined}
                      className={cn(
                        "flex w-full gap-3 rounded-lg border-1.5 px-3 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected ? "border-ink bg-vellum" : "border-transparent hover:bg-secondary"
                      )}
                    >
                      {number != null && <MapPin number={number} selected={selected} />}
                      {location.type === "artist" && (
                        <Plate alt="" name={location.name} primaryStyle={location.styles[0]} size={40} />
                      )}
                      <span className="block min-w-0 flex-1">
                        <span className="block font-heading text-[21px] leading-tight text-ink">{location.name}</span>
                        <span className="block text-[13px] text-ink-muted">{locationKindLabel(location)}</span>
                        {location.address && (
                          <span className="mt-1 block text-[15px] text-ink">{location.address}</span>
                        )}
                        <span className="mt-1 block text-[15px] tabular-nums text-ink-muted">
                          {ratingLine(location.rating, location.reviewCount)}
                          {location.distance != null &&
                            `, ${
                              location.distance < 1
                                ? `${(location.distance * 5280).toFixed(0)} ft`
                                : `${location.distance.toFixed(1)} mi`
                            } away`}
                          {location.isOpen && <span className="font-semibold text-bottle-green">. Walk-ins welcome</span>}
                        </span>
                        {badges.length > 0 && (
                          <span className="mt-2.5 flex flex-wrap gap-1.5">
                            {badges.map(({ slug, label }) => (
                              <StyleBadge key={slug} slug={slug} label={label} />
                            ))}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
