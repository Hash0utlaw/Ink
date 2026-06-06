"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ShopFilterSidebar } from "./shop-filter-sidebar"
import { ShopResultsList } from "./shop-results-list"
import { MapView } from "@/components/artists/map-view"
import type { Shop } from "@/types/shop"

type Filters = {
  styles: string[]
  rating: number
  acceptsWalkIns: boolean
  zip: string
  state: string
  city: string
  query: string
  sortBy: "rating" | "review_count" | "name"
  radiusMiles: number
}

const DEFAULT_FILTERS: Filters = {
  styles: [],
  rating: 0,
  acceptsWalkIns: false,
  zip: "",
  state: "",
  city: "",
  query: "",
  sortBy: "rating",
  radiusMiles: 25,
}

const VALID_SORT = ["rating", "review_count", "name"] as const

function filtersFromParams(params: URLSearchParams): Filters {
  const sortByRaw = params.get("sortBy") ?? ""
  return {
    styles: params.get("styles")?.split(",").filter(Boolean) ?? [],
    rating: Number(params.get("rating")) || 0,
    acceptsWalkIns: params.get("acceptsWalkIns") === "true",
    zip: params.get("zip") ?? "",
    state: params.get("state") ?? "",
    city: params.get("city") ?? "",
    query: params.get("query") ?? "",
    sortBy: (VALID_SORT as readonly string[]).includes(sortByRaw)
      ? (sortByRaw as Filters["sortBy"])
      : "rating",
    radiusMiles: 25,
  }
}

function buildApiParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.styles.length > 0) params.set("styles", filters.styles.join(","))
  if (filters.rating > 0) params.set("rating", String(filters.rating))
  if (filters.acceptsWalkIns) params.set("acceptsWalkIns", "true")
  if (filters.zip) params.set("zip", filters.zip)
  if (filters.state) params.set("state", filters.state)
  if (filters.city) params.set("city", filters.city)
  if (filters.query) params.set("query", filters.query)
  if (filters.sortBy !== "rating") params.set("sortBy", filters.sortBy)
  return params
}

type ActivePill = { key: string; label: string }

function getActivePills(filters: Filters): ActivePill[] {
  const pills: ActivePill[] = []
  if (filters.styles.length > 0) {
    filters.styles.forEach((s) => pills.push({ key: `style:${s}`, label: s }))
  }
  if (filters.rating > 0) pills.push({ key: "rating", label: `${filters.rating.toFixed(1)}★+` })
  if (filters.acceptsWalkIns) pills.push({ key: "acceptsWalkIns", label: "Walk-ins" })
  if (filters.zip) pills.push({ key: "zip", label: `ZIP: ${filters.zip}` })
  if (filters.state) pills.push({ key: "state", label: `State: ${filters.state}` })
  if (filters.city) pills.push({ key: "city", label: `City: ${filters.city}` })
  if (filters.query) pills.push({ key: "query", label: `"${filters.query}"` })
  if (filters.sortBy !== "rating") pills.push({ key: "sortBy", label: `Sort: ${filters.sortBy.replace("_", " ")}` })
  return pills
}

export function ShopSearchInterface() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(searchParams))
  const [filteredShops, setFilteredShops] = useState<Shop[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [nearMeCoords, setNearMeCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [distancesById, setDistancesById] = useState<Record<string, number>>({})

  const handleFilterChange = useCallback(
    (newFilters: Filters) => {
      setNearMeCoords(null)
      setDistancesById({})
      setFilters(newFilters)
      const params = buildApiParams(newFilters)
      router.replace(`/shops?${params.toString()}`, { scroll: false })
    },
    [router],
  )

  function clearFilter(key: string) {
    const next = { ...filters }
    if (key.startsWith("style:")) {
      const style = key.slice(6)
      next.styles = next.styles.filter((s) => s !== style)
    } else if (key === "rating") {
      next.rating = 0
    } else if (key === "acceptsWalkIns") {
      next.acceptsWalkIns = false
    } else if (key === "zip") {
      next.zip = ""
    } else if (key === "state") {
      next.state = ""
    } else if (key === "city") {
      next.city = ""
    } else if (key === "query") {
      next.query = ""
    } else if (key === "sortBy") {
      next.sortBy = "rating"
    }
    handleFilterChange(next)
  }

  async function handleNearMe(lat: number, lng: number) {
    setNearMeCoords({ lat, lng })
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radiusMiles: String(filters.radiusMiles),
      })
      if (filters.rating > 0) params.set("rating", String(filters.rating))
      if (filters.acceptsWalkIns) params.set("acceptsWalkIns", "true")
      const res = await fetch(`/api/shops/nearby?${params}`)
      if (!res.ok) throw new Error("Failed to fetch nearby shops")
      const json = await res.json()
      const shops: Shop[] = json.data ?? []
      setFilteredShops(shops)
      setTotalCount(shops.length)
      const map: Record<string, number> = {}
      shops.forEach((s) => {
        if (s.distance_mi != null) map[s.id] = s.distance_mi
      })
      setDistancesById(map)
    } catch (e) {
      console.error(e)
      setFilteredShops([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (nearMeCoords) return
    const fetchShops = async () => {
      setIsLoading(true)
      const params = buildApiParams(filters)
      try {
        const response = await fetch(`/api/shops?${params.toString()}`)
        if (!response.ok) throw new Error("Failed to fetch shops")
        const json = await response.json()
        setFilteredShops(json.data ?? [])
        setTotalCount(json.count ?? 0)
      } catch (error) {
        console.error(error)
        setFilteredShops([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    }
    fetchShops()
  }, [filters]) // nearMeCoords intentionally omitted — near-me results are set by handleNearMe

  const activePills = getActivePills(filters)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1">
        <ShopFilterSidebar filters={filters} onFilterChange={handleFilterChange} onNearMe={handleNearMe} />
      </div>
      <div className="lg:col-span-3 space-y-4">
        {/* Active filter pills */}
        {activePills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activePills.map((pill) => (
              <button
                key={pill.key}
                onClick={() => clearFilter(pill.key)}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-accent/10 text-accent border border-accent/20 rounded-full hover:bg-accent/20 transition-colors"
              >
                {pill.label}
                <span className="ml-1 opacity-70">×</span>
              </button>
            ))}
          </div>
        )}

        {/* Result count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredShops.length} of {totalCount} shops
            {nearMeCoords ? " near you" : ""}
          </p>
        )}

        <MapView artists={filteredShops as any} />
        <ShopResultsList shops={filteredShops} isLoading={isLoading} distancesById={distancesById} />
      </div>
    </div>
  )
}
