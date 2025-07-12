"use client"

import { useState, useEffect } from "react"
import { ShopFilterSidebar } from "./shop-filter-sidebar"
import { ShopResultsList } from "./shop-results-list"
import { MapView } from "@/components/artists/map-view"
import type { Shop } from "@/types/shop"

export function ShopSearchInterface() {
  const [filters, setFilters] = useState({
    styles: [] as string[],
    rating: 0,
    acceptsWalkIns: false,
  })
  const [filteredShops, setFilteredShops] = useState<Shop[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchShops = async () => {
      setIsLoading(true)

      const params = new URLSearchParams()
      if (filters.styles.length > 0) params.append("styles", filters.styles.join(","))
      if (filters.rating > 0) params.append("rating", filters.rating.toString())
      if (filters.acceptsWalkIns) params.append("acceptsWalkIns", "true")

      try {
        const response = await fetch(`/api/shops?${params.toString()}`)
        if (!response.ok) {
          throw new Error("Failed to fetch shops")
        }
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
        <ShopFilterSidebar filters={filters} onFilterChange={setFilters} />
      </div>
      <div className="lg:col-span-3 space-y-8">
        {/* The MapView component expects an 'artists' prop, but a 'shop' object has a compatible structure for the map's needs (id, name, location). We can cast it for now. */}
        <MapView artists={filteredShops as any} />
        <ShopResultsList shops={filteredShops} isLoading={isLoading} />
      </div>
    </div>
  )
}
