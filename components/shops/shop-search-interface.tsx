"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ShopFilterSidebar } from "./shop-filter-sidebar"
import { ShopResultsList } from "./shop-results-list"
import { MapView } from "@/components/artists/map-view"
import { X } from "lucide-react"
import type { Shop } from "@/types/shop"

type Filters = {
  styles: string[]
  rating: number
  acceptsWalkIns: boolean
  zip: string
  state: string
  city: string
  query: string
  sortBy: 'rating' | 'review_count' | 'name'
  radiusMiles: number
}

const DEFAULT_FILTERS: Filters = {
  styles: [],
  rating: 0,
  acceptsWalkIns: false,
  zip: '',
  state: '',
  city: '',
  query: '',
  sortBy: 'rating',
  radiusMiles: 25,
}

function filtersFromParams(params: URLSearchParams): Filters {
  return {
    styles: params.get("styles")?.split(",").filter(Boolean) ?? [],
    rating: Number(params.get("rating")) || 0,
    acceptsWalkIns: params.get("acceptsWalkIns") === "true",
    zip: params.get("zip") ?? '',
    state: params.get("state") ?? '',
    city: params.get("city") ?? '',
    query: params.get("query") ?? '',
    sortBy: (params.get("sortBy") as Filters['sortBy']) ?? 'rating',
    radiusMiles: Number(params.get("radiusMiles")) || 25,
  }
}

export function ShopSearchInterface() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(searchParams))
  const [filteredShops, setFilteredShops] = useState<Shop[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [nearMeCoords, setNearMeCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [distancesById, setDistancesById] = useState<Record<string, number>>({})

  const handleFilterChange = useCallback(
    (newFilters: Filters) => {
      setFilters(newFilters)
      const params = new URLSearchParams()
      if (newFilters.styles.length > 0) params.set("styles", newFilters.styles.join(","))
      if (newFilters.rating > 0) params.set("rating", newFilters.rating.toString())
      if (newFilters.acceptsWalkIns) params.set("acceptsWalkIns", "true")
      if (newFilters.zip) params.set("zip", newFilters.zip)
      if (newFilters.state) params.set("state", newFilters.state)
      if (newFilters.city) params.set("city", newFilters.city)
      if (newFilters.query) params.set("query", newFilters.query)
      if (newFilters.sortBy !== 'rating') params.set("sortBy", newFilters.sortBy)
      router.replace(`/shops?${params.toString()}`, { scroll: false })
    },
    [router],
  )

  async function handleNearMe(lat: number, lng: number) {
    setNearMeCoords({ lat, lng })
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/shops/nearby?lat=${lat}&lng=${lng}&radius=${filters.radiusMiles}&rating=${filters.rating}&walkIns=${filters.acceptsWalkIns}`
      )
      const { data } = await res.json()
      const shops = data ?? []
      setFilteredShops(shops)
      setTotalCount(shops.length)
      // Build distancesById map from returned data
      const distances: Record<string, number> = {}
      shops.forEach((s: any) => {
        if (s.distance_mi != null) distances[s.id] = s.distance_mi
      })
      setDistancesById(distances)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const fetchShops = async () => {
      setIsLoading(true)

      const params = new URLSearchParams()
      if (filters.styles.length > 0) params.set("styles", filters.styles.join(","))
      if (filters.rating > 0) params.set("rating", filters.rating.toString())
      if (filters.acceptsWalkIns) params.set("acceptsWalkIns", "true")
      if (filters.zip) params.set("zip", filters.zip)
      if (filters.state) params.set("state", filters.state)
      if (filters.city) params.set("city", filters.city)
      if (filters.query) params.set("query", filters.query)
      if (filters.sortBy !== 'rating') params.set("sortBy", filters.sortBy)

      try {
        const response = await fetch(`/api/shops?${params.toString()}`)
        if (!response.ok) throw new Error("Failed to fetch shops")
        const json = await response.json()
        // Support both array response and { data, count } shape
        const shops = Array.isArray(json) ? json : (json.data ?? [])
        const count = Array.isArray(json) ? json.length : (json.count ?? json.length ?? shops.length)
        setFilteredShops(shops)
        setTotalCount(count)
      } catch (error) {
        console.error(error)
        setFilteredShops([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchShops()
  }, [filters])

  // Active filter pills helpers
  const hasActiveFilters =
    filters.query !== '' ||
    filters.zip !== '' ||
    filters.state !== '' ||
    filters.city !== '' ||
    filters.rating > 0 ||
    filters.acceptsWalkIns ||
    filters.styles.length > 0 ||
    nearMeCoords !== null

  function clearFilter(key: keyof Filters | 'nearMe' | `style:${string}`) {
    if (key === 'nearMe') {
      setNearMeCoords(null)
      setDistancesById({})
      return
    }
    if (typeof key === 'string' && key.startsWith('style:')) {
      const style = key.replace('style:', '')
      handleFilterChange({ ...filters, styles: filters.styles.filter((s) => s !== style) })
      return
    }
    if (key === 'rating') handleFilterChange({ ...filters, rating: 0 })
    else if (key === 'acceptsWalkIns') handleFilterChange({ ...filters, acceptsWalkIns: false })
    else handleFilterChange({ ...filters, [key]: '' })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1">
        <ShopFilterSidebar
          filters={filters}
          onFilterChange={handleFilterChange}
          onNearMe={handleNearMe}
        />
      </div>
      <div className="lg:col-span-3 space-y-8">
        <MapView artists={filteredShops as any} />

        {/* Active filter pills */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.query && (
              <span className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                {filters.query}
                <button onClick={() => clearFilter('query')} aria-label="Remove query filter"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.zip && (
              <span className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                ZIP: {filters.zip}
                <button onClick={() => clearFilter('zip')} aria-label="Remove ZIP filter"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.state && (
              <span className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                {filters.state}
                <button onClick={() => clearFilter('state')} aria-label="Remove state filter"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.city && (
              <span className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                {filters.city}
                <button onClick={() => clearFilter('city')} aria-label="Remove city filter"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.rating > 0 && (
              <span className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                {filters.rating}+ stars
                <button onClick={() => clearFilter('rating')} aria-label="Remove rating filter"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.acceptsWalkIns && (
              <span className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                Walk-ins only
                <button onClick={() => clearFilter('acceptsWalkIns')} aria-label="Remove walk-ins filter"><X className="w-3 h-3" /></button>
              </span>
            )}
            {nearMeCoords && (
              <span className="bg-accent/10 text-accent border border-accent/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                {filters.radiusMiles} mi radius
                <button onClick={() => clearFilter('nearMe')} aria-label="Remove near me filter"><X className="w-3 h-3" /></button>
              </span>
            )}
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

        {/* Result count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground -mt-4">
            Showing {filteredShops.length} of {totalCount} shops
          </p>
        )}

        <ShopResultsList
          shops={filteredShops}
          isLoading={isLoading}
          distancesById={nearMeCoords ? distancesById : undefined}
        />
      </div>
    </div>
  )
}
