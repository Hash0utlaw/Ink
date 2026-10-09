"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ShopFilterSidebar } from "./shop-filter-sidebar"
import { ShopResultsList } from "./shop-results-list"
import type { Shop } from "@/types/shop"
import { styleLabel, toStyleSlugs } from "@/lib/styles"
import { formatLocation } from "@/lib/parse-location"
import { FinderCta } from "@/components/layout/finder-cta"
import { FilterDrawer } from "@/components/listings/filter-drawer"
import { ActiveFilter } from "@/components/listings/filter-controls"
import { ListingHeader, countLabel } from "@/components/listings/listing-header"

const PAGE_SIZE = 24

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
    // Slugs; old links may carry names ("Fine Line") — mapped to slugs.
    styles: toStyleSlugs(params.get("styles")?.split(",").filter(Boolean) ?? []),
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
  const [page, setPage] = useState(0)
  const [filteredShops, setFilteredShops] = useState<Shop[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [nearMeCoords, setNearMeCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [distancesById, setDistancesById] = useState<Record<string, number>>({})

  const handleFilterChange = useCallback(
    (newFilters: Filters) => {
      setFilters(newFilters)
      setPage(0)
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
    if (searchParams.get("nearme") !== "1") return
    const lat = sessionStorage.getItem("tm_lat")
    const lng = sessionStorage.getItem("tm_lng")
    if (lat && lng) {
      handleNearMe(Number(lat), Number(lng))
      sessionStorage.removeItem("tm_lat")
      sessionStorage.removeItem("tm_lng")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      params.set("page", String(page))

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
  }, [filters, page])

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

  const place = nearMeCoords ? "" : formatLocation({ zip: filters.zip.trim(), city: filters.city.trim(), state: filters.state })
  const activeCount =
    [filters.query, filters.zip, filters.state, filters.city].filter(Boolean).length +
    (filters.rating > 0 ? 1 : 0) +
    (filters.acceptsWalkIns ? 1 : 0) +
    (nearMeCoords ? 1 : 0) +
    filters.styles.length

  return (
    <div>
      <ListingHeader
        title="Tattoo shops"
        place={place}
        suffix={nearMeCoords ? "near you" : undefined}
        countLine={isLoading ? null : countLabel(totalCount, "shop")}
      >
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/map" className="text-[15px] font-semibold text-navy underline underline-offset-2 hover:no-underline">
            View shops on the map
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
            <ShopFilterSidebar
              filters={filters}
              onFilterChange={(f) => handleFilterChange(f as Filters)}
              onNearMe={handleNearMe}
            />
          </FilterDrawer>
        </aside>

        <div className="min-w-0 space-y-6">
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {filters.query && <ActiveFilter label={filters.query} onRemove={() => clearFilter('query')} />}
              {filters.zip && <ActiveFilter label={`ZIP ${filters.zip}`} onRemove={() => clearFilter('zip')} />}
              {filters.state && <ActiveFilter label={filters.state} onRemove={() => clearFilter('state')} />}
              {filters.city && <ActiveFilter label={filters.city} onRemove={() => clearFilter('city')} />}
              {filters.rating > 0 && <ActiveFilter label={`${filters.rating}+ stars`} onRemove={() => clearFilter('rating')} />}
              {filters.acceptsWalkIns && <ActiveFilter label="Walk-ins only" onRemove={() => clearFilter('acceptsWalkIns')} />}
              {nearMeCoords && <ActiveFilter label={`Within ${filters.radiusMiles} mi`} onRemove={() => clearFilter('nearMe')} />}
              {filters.styles.map((style) => (
                <ActiveFilter key={style} label={styleLabel(style) ?? style} onRemove={() => clearFilter(`style:${style}`)} />
              ))}
              <button
                className="ml-auto min-h-9 text-[15px] font-semibold text-navy underline underline-offset-2 hover:no-underline"
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

          <ShopResultsList
            shops={filteredShops}
            isLoading={isLoading}
            distancesById={nearMeCoords ? distancesById : undefined}
            emptyMessage={place ? `No shops found near ${place}. Try a nearby city or a different style.` : undefined}
            // Near me loads every result at once, so it has no pages.
            page={page}
            totalPages={nearMeCoords ? 1 : Math.ceil(totalCount / PAGE_SIZE)}
            onPageChange={nearMeCoords ? undefined : setPage}
          />
        </div>
      </div>
    </div>
  )
}
