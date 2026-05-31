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
}

function filtersFromParams(params: URLSearchParams): Filters {
  return {
    styles: params.get("styles")?.split(",").filter(Boolean) ?? [],
    rating: Number(params.get("rating")) || 0,
    acceptsWalkIns: params.get("acceptsWalkIns") === "true",
  }
}

export function ShopSearchInterface() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(searchParams))
  const [filteredShops, setFilteredShops] = useState<Shop[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const handleFilterChange = useCallback(
    (newFilters: Filters) => {
      setFilters(newFilters)
      const params = new URLSearchParams()
      if (newFilters.styles.length > 0) params.set("styles", newFilters.styles.join(","))
      if (newFilters.rating > 0) params.set("rating", newFilters.rating.toString())
      if (newFilters.acceptsWalkIns) params.set("acceptsWalkIns", "true")
      router.replace(`/shops?${params.toString()}`, { scroll: false })
    },
    [router],
  )

  useEffect(() => {
    const fetchShops = async () => {
      setIsLoading(true)

      const params = new URLSearchParams()
      if (filters.styles.length > 0) params.set("styles", filters.styles.join(","))
      if (filters.rating > 0) params.set("rating", filters.rating.toString())
      if (filters.acceptsWalkIns) params.set("acceptsWalkIns", "true")

      try {
        const response = await fetch(`/api/shops?${params.toString()}`)
        if (!response.ok) throw new Error("Failed to fetch shops")
        const data = await response.json()
        setFilteredShops(data)
      } catch (error) {
        console.error(error)
        setFilteredShops([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchShops()
  }, [filters])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1">
        <ShopFilterSidebar filters={filters} onFilterChange={handleFilterChange} />
      </div>
      <div className="lg:col-span-3 space-y-8">
        {/* MapView expects Artist shape; Shop has a compatible location structure */}
        <MapView artists={filteredShops as any} />
        <ShopResultsList shops={filteredShops} isLoading={isLoading} />
      </div>
    </div>
  )
}
