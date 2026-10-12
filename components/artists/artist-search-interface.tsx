"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { FilterSidebar } from "./filter-sidebar"
import type { ArtistFilterValues } from "./filter-sidebar"
import { ResultsList } from "./results-list"
import type { Artist } from "@/types/artist"
import { styleLabel, toStyleSlugs } from "@/lib/styles"
import { formatLocation } from "@/lib/parse-location"
import { FinderCta } from "@/components/layout/finder-cta"
import { FilterDrawer } from "@/components/listings/filter-drawer"
import { ActiveFilter } from "@/components/listings/filter-controls"
import { ListingHeader, countLabel } from "@/components/listings/listing-header"

const DEFAULT_FILTERS: ArtistFilterValues = {
  styles: [],
  price: [],
  rating: 0,
  availableNow: false,
  query: "",
  city: "",
  state: "",
  zip: "",
  sortBy: "rating",
  radiusMiles: 25,
}

function filtersFromParams(params: URLSearchParams): ArtistFilterValues {
  return {
    // Slugs; old links may carry names ("Fine Line") — mapped to slugs.
    styles: toStyleSlugs(params.get("styles")?.split(",").filter(Boolean) ?? []),
    // TODO: Re-enable when claimed artists set their own price tier.
    price: [],
    rating: Number(params.get("rating")) || 0,
    availableNow: params.get("availableNow") === "true",
    query: params.get("query") ?? "",
    city: params.get("city") ?? "",
    state: params.get("state") ?? "",
    zip: params.get("zip") ?? "",
    sortBy: (params.get("sortBy") as ArtistFilterValues["sortBy"]) ?? "rating",
    radiusMiles: Number(params.get("radiusMiles")) || 25,
  }
}

export function ArtistSearchInterface({ showAvailableNow = false }: { showAvailableNow?: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<ArtistFilterValues>(() => filtersFromParams(searchParams))
  const [page, setPage] = useState(0)
  const [filteredArtists, setFilteredArtists] = useState<Artist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [nearMeCoords, setNearMeCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [distancesById, setDistancesById] = useState<Record<string, number>>({})

  const handleFilterChange = useCallback(
    (newFilters: ArtistFilterValues) => {
      setFilters(newFilters)
      setPage(0)
      const params = new URLSearchParams()
      if (newFilters.styles.length > 0) params.set("styles", newFilters.styles.join(","))
      if (newFilters.price.length > 0) params.set("price", newFilters.price.join(","))
      if (newFilters.rating > 0) params.set("rating", newFilters.rating.toString())
      if (newFilters.availableNow) params.set("availableNow", "true")
      if (newFilters.query) params.set("query", newFilters.query)
      if (newFilters.city) params.set("city", newFilters.city)
      if (newFilters.state) params.set("state", newFilters.state)
      if (newFilters.zip) params.set("zip", newFilters.zip)
      if (newFilters.sortBy !== "rating") params.set("sortBy", newFilters.sortBy)
      router.replace(`/artists?${params.toString()}`, { scroll: false })
    },
    [router],
  )

  async function handleNearMe(lat: number, lng: number) {
    setNearMeCoords({ lat, lng })
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/artists/nearby?lat=${lat}&lng=${lng}&radius=${filters.radiusMiles}&rating=${filters.rating}&available=${filters.availableNow}`
      )
      const { data } = await res.json()
      const artists = data ?? []
      setFilteredArtists(artists)
      setTotalCount(artists.length)
      const distances: Record<string, number> = {}
      artists.forEach((a: Artist & { distance_mi?: number }) => {
        if (a.distance_mi != null) distances[a.id] = a.distance_mi
      })
      setDistancesById(distances)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const fetchArtists = async () => {
      setIsLoading(true)

      const params = new URLSearchParams()
      if (filters.styles.length > 0) params.set("styles", filters.styles.join(","))
      if (filters.price.length > 0) params.set("price", filters.price.join(","))
      if (filters.rating > 0) params.set("rating", filters.rating.toString())
      if (filters.availableNow) params.set("availableNow", "true")
      if (filters.query) params.set("query", filters.query)
      if (filters.city) params.set("city", filters.city)
      if (filters.state) params.set("state", filters.state)
      if (filters.zip) params.set("zip", filters.zip)
      // Always sent: without it the API sorts A to Z, not by rating. The page URL still omits the default.
      params.set("sortBy", filters.sortBy)
      params.set("page", String(page))

      try {
        const response = await fetch(`/api/artists?${params.toString()}`)
        if (!response.ok) throw new Error("Failed to fetch artists")
        const json = await response.json()
        const artists = Array.isArray(json) ? json : (json.data ?? [])
        const count = Array.isArray(json) ? json.length : (json.count ?? artists.length)
        setFilteredArtists(artists)
        setTotalCount(count)
      } catch (error) {
        console.error(error)
        setFilteredArtists([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchArtists()
  }, [filters, page])

  const hasActiveFilters =
    filters.query !== "" ||
    filters.zip !== "" ||
    filters.state !== "" ||
    filters.city !== "" ||
    filters.rating > 0 ||
    filters.availableNow ||
    filters.styles.length > 0 ||
    filters.price.length > 0 ||
    nearMeCoords !== null

  function clearFilter(key: keyof ArtistFilterValues | "nearMe" | `style:${string}` | `price:${string}`) {
    if (key === "nearMe") {
      setNearMeCoords(null)
      setDistancesById({})
      return
    }
    if (typeof key === "string" && key.startsWith("style:")) {
      const style = key.replace("style:", "")
      handleFilterChange({ ...filters, styles: filters.styles.filter((s) => s !== style) })
      return
    }
    if (typeof key === "string" && key.startsWith("price:")) {
      const tier = key.replace("price:", "")
      handleFilterChange({ ...filters, price: filters.price.filter((p) => p !== tier) })
      return
    }
    if (key === "rating") handleFilterChange({ ...filters, rating: 0 })
    else if (key === "availableNow") handleFilterChange({ ...filters, availableNow: false })
    else handleFilterChange({ ...filters, [key]: "" })
  }

  const priceLabel: Record<string, string> = { low: "$", medium: "$$", high: "$$$" }
  const place = nearMeCoords ? "" : formatLocation({ zip: filters.zip.trim(), city: filters.city.trim(), state: filters.state })
  const activeCount =
    [filters.query, filters.zip, filters.state, filters.city].filter(Boolean).length +
    (filters.rating > 0 ? 1 : 0) +
    (filters.availableNow ? 1 : 0) +
    (nearMeCoords ? 1 : 0) +
    filters.styles.length +
    filters.price.length

  return (
    <div>
      <ListingHeader
        title="Tattoo artists"
        place={place}
        suffix={nearMeCoords ? "near you" : undefined}
        countLine={isLoading ? null : countLabel(totalCount, "artist")}
      >
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/map" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-navy underline underline-offset-2 hover:no-underline">
            View artists on the map
          </Link>
          <FinderCta variant="inline" />
        </div>
      </ListingHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
        <aside aria-label="Filters" className="lg:sticky lg:top-20 lg:self-start">
          <FilterDrawer
            resultLabel={isLoading ? null : `Show ${countLabel(totalCount, "result")}`}
            activeCount={activeCount}
          >
            <FilterSidebar filters={filters} onFilterChange={handleFilterChange} onNearMe={handleNearMe} showAvailableNow={showAvailableNow} />
          </FilterDrawer>
        </aside>

        <div className="min-w-0 space-y-6">
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {filters.query && <ActiveFilter label={filters.query} onRemove={() => clearFilter("query")} />}
              {filters.zip && <ActiveFilter label={`ZIP ${filters.zip}`} onRemove={() => clearFilter("zip")} />}
              {filters.state && <ActiveFilter label={filters.state} onRemove={() => clearFilter("state")} />}
              {filters.city && <ActiveFilter label={filters.city} onRemove={() => clearFilter("city")} />}
              {filters.rating > 0 && <ActiveFilter label={`${filters.rating}+ stars`} onRemove={() => clearFilter("rating")} />}
              {filters.availableNow && <ActiveFilter label="Available now" onRemove={() => clearFilter("availableNow")} />}
              {nearMeCoords && <ActiveFilter label={`Within ${filters.radiusMiles} mi`} onRemove={() => clearFilter("nearMe")} />}
              {filters.price.map((tier) => (
                <ActiveFilter key={tier} label={priceLabel[tier] ?? tier} onRemove={() => clearFilter(`price:${tier}`)} />
              ))}
              {filters.styles.map((style) => (
                <ActiveFilter key={style} label={styleLabel(style) ?? style} onRemove={() => clearFilter(`style:${style}`)} />
              ))}
              <button
                className="ml-auto min-h-11 text-[15px] font-semibold text-navy underline underline-offset-2 hover:no-underline"
                onClick={() => {
                  setNearMeCoords(null)
                  setDistancesById({})
                  handleFilterChange(DEFAULT_FILTERS)
                }}
              >
                Clear all
              </button>
            </div>
          )}

          <ResultsList
            artists={filteredArtists}
            isLoading={isLoading}
            distancesById={nearMeCoords ? distancesById : undefined}
            page={page}
            totalCount={totalCount}
            // Near me loads every result at once, so it has a single page.
            pageSize={nearMeCoords ? Math.max(totalCount, 1) : 24}
            onPageChange={setPage}
            emptyMessage={
              place
                ? `No artists found near ${place}. Try a nearby city or a different style.`
                : undefined
            }
          />
        </div>
      </div>
    </div>
  )
}
