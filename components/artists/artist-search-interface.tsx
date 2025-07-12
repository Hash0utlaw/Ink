"use client"

import { useState, useEffect } from "react"
import { FilterSidebar } from "./filter-sidebar"
import { ResultsList } from "./results-list"
import { MapView } from "./map-view"
import type { Artist } from "@/types/artist"

export function ArtistSearchInterface() {
  const [filters, setFilters] = useState({
    styles: [] as string[],
    price: [] as string[],
    rating: 0,
    availableNow: false,
  })
  const [filteredArtists, setFilteredArtists] = useState<Artist[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchArtists = async () => {
      setIsLoading(true)

      const params = new URLSearchParams()
      if (filters.styles.length > 0) params.append("styles", filters.styles.join(","))
      if (filters.price.length > 0) params.append("price", filters.price.join(","))
      if (filters.rating > 0) params.append("rating", filters.rating.toString())
      if (filters.availableNow) params.append("availableNow", "true")

      try {
        const response = await fetch(`/api/artists?${params.toString()}`)
        if (!response.ok) {
          throw new Error("Failed to fetch artists")
        }
        const data = await response.json()
        setFilteredArtists(data)
      } catch (error) {
        console.error(error)
        setFilteredArtists([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchArtists()
  }, [filters])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1">
        <FilterSidebar filters={filters} onFilterChange={setFilters} />
      </div>
      <div className="lg:col-span-3 space-y-8">
        <MapView artists={filteredArtists} />
        <ResultsList artists={filteredArtists} isLoading={isLoading} />
      </div>
    </div>
  )
}
