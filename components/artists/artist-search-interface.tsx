"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FilterSidebar } from "./filter-sidebar"
import type { ArtistFilterValues } from "./filter-sidebar"
import { ResultsList } from "./results-list"
import { MapView } from "@/components/artists/map-view"
import { X } from "lucide-react"
import type { Artist } from "@/types/artist"

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
    styles: params.get("styles")?.split(",").filter(Boolean) ?? [],
    price: params.get("price")?.split(",").filter(Boolean) ?? [],
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

export function ArtistSearchInterface() {
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
      if (filters.sortBy !== "rating") params.set("sortBy", filters.sortBy)
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1">
        <FilterSidebar filters={filters} onFilterChange={handleFilterChange} onNearMe={handleNearMe} />
      </div>
      <div className="lg:col-span-3 space-y-8">
        <MapView artists={filteredArtists} />

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.query && (
              <span className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                {filters.query}
                <button onClick={() => clearFilter("query")} aria-label="Remove query filter"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.zip && (
              <span className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                ZIP: {filters.zip}
                <button onClick={() => clearFilter("zip")} aria-label="Remove ZIP filter"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.state && (
              <span className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                {filters.state}
                <button onClick={() => clearFilter("state")} aria-label="Remove state filter"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.city && (
              <span className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                {filters.city}
                <button onClick={() => clearFilter("city")} aria-label="Remove city filter"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.rating > 0 && (
              <span className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                {filters.rating}+ stars
                <button onClick={() => clearFilter("rating")} aria-label="Remove rating filter"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.availableNow && (
              <span className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                Available now
                <button onClick={() => clearFilter("availableNow")} aria-label="Remove availability filter"><X className="w-3 h-3" /></button>
              </span>
            )}
            {nearMeCoords && (
              <span className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                {filters.radiusMiles} mi radius
                <button onClick={() => clearFilter("nearMe")} aria-label="Remove near me filter"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.price.map((tier) => (
              <span key={tier} className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                {priceLabel[tier] ?? tier}
                <button onClick={() => clearFilter(`price:${tier}` as any)} aria-label={`Remove ${tier} price filter`}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {filters.styles.map((style) => (
              <span key={style} className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                {style}
                <button onClick={() => clearFilter(`style:${style}` as any)} aria-label={`Remove ${style} filter`}><X className="w-3 h-3" /></button>
              </span>
            ))}
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors ml-auto"
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

        {!isLoading && (
          <p className="text-sm text-muted-foreground -mt-4">
            Showing {filteredArtists.length} of {totalCount} artists
          </p>
        )}

        <ResultsList
          artists={filteredArtists}
          isLoading={isLoading}
          distancesById={nearMeCoords ? distancesById : undefined}
          page={page}
          totalCount={totalCount}
          pageSize={24}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
