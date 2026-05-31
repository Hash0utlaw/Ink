"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FilterSidebar } from "./filter-sidebar"
import { ResultsList } from "./results-list"
import type { Artist } from "@/types/artist"

type Filters = {
  styles: string[]
  price: string[]
  rating: number
  availableNow: boolean
}

function filtersFromParams(params: URLSearchParams): Filters {
  return {
    styles: params.get("styles")?.split(",").filter(Boolean) ?? [],
    price: params.get("price")?.split(",").filter(Boolean) ?? [],
    rating: Number(params.get("rating")) || 0,
    availableNow: params.get("availableNow") === "true",
  }
}

export function ArtistSearchInterface() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(searchParams))
  const [filteredArtists, setFilteredArtists] = useState<Artist[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const handleFilterChange = useCallback(
    (newFilters: Filters) => {
      setFilters(newFilters)
      const params = new URLSearchParams()
      if (newFilters.styles.length > 0) params.set("styles", newFilters.styles.join(","))
      if (newFilters.price.length > 0) params.set("price", newFilters.price.join(","))
      if (newFilters.rating > 0) params.set("rating", newFilters.rating.toString())
      if (newFilters.availableNow) params.set("availableNow", "true")
      // Keep any q param from hero search
      const q = searchParams.get("q")
      if (q) params.set("q", q)
      router.replace(`/artists?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  useEffect(() => {
    const fetchArtists = async () => {
      setIsLoading(true)

      const params = new URLSearchParams()
      if (filters.styles.length > 0) params.set("styles", filters.styles.join(","))
      if (filters.price.length > 0) params.set("price", filters.price.join(","))
      if (filters.rating > 0) params.set("rating", filters.rating.toString())
      if (filters.availableNow) params.set("availableNow", "true")

      try {
        const response = await fetch(`/api/artists?${params.toString()}`)
        if (!response.ok) throw new Error("Failed to fetch artists")
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
        <FilterSidebar filters={filters} onFilterChange={handleFilterChange} />
      </div>
      <div className="lg:col-span-3 space-y-8">
        <ResultsList artists={filteredArtists} isLoading={isLoading} />
      </div>
    </div>
  )
}
