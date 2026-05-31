"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FilterSidebar } from "@/components/artists/filter-sidebar"
import { ResultsList } from "@/components/artists/results-list"
import { ShopResultsList } from "@/components/shops/shop-results-list"
import type { Artist } from "@/types/artist"
import type { Shop } from "@/types/shop"

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

export function SearchInterface() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const q = searchParams.get("q") ?? ""

  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(searchParams))
  const [artists, setArtists] = useState<Artist[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("artists")

  const handleFilterChange = useCallback(
    (newFilters: Filters) => {
      setFilters(newFilters)
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      if (newFilters.styles.length > 0) params.set("styles", newFilters.styles.join(","))
      if (newFilters.price.length > 0) params.set("price", newFilters.price.join(","))
      if (newFilters.rating > 0) params.set("rating", newFilters.rating.toString())
      if (newFilters.availableNow) params.set("availableNow", "true")
      router.replace(`/search?${params.toString()}`, { scroll: false })
    },
    [router, q],
  )

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (filters.styles.length > 0) params.set("styles", filters.styles.join(","))
      if (filters.price.length > 0) params.set("price", filters.price.join(","))
      if (filters.rating > 0) params.set("rating", filters.rating.toString())
      if (filters.availableNow) params.set("availableNow", "true")

      try {
        const [artistsRes, shopsRes] = await Promise.all([
          fetch(`/api/artists?${params.toString()}`),
          fetch(`/api/shops?${params.toString()}`),
        ])
        setArtists(artistsRes.ok ? await artistsRes.json() : [])
        setShops(shopsRes.ok ? await shopsRes.json() : [])
      } catch {
        setArtists([])
        setShops([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAll()
  }, [filters])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1">
        <FilterSidebar filters={filters} onFilterChange={handleFilterChange} />
      </div>

      <div className="lg:col-span-3 space-y-6">
        {q && (
          <p className="text-sm text-muted-foreground">
            Results for <span className="font-semibold text-foreground">"{q}"</span>
          </p>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="artists">
              Artists{!isLoading ? ` (${artists.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="shops">
              Shops{!isLoading ? ` (${shops.length})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="artists" className="mt-6">
            <ResultsList artists={artists} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="shops" className="mt-6">
            <ShopResultsList shops={shops} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
