"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FilterSidebar } from "@/components/artists/filter-sidebar"
import { ResultsList } from "@/components/artists/results-list"
import { ShopResultsList } from "@/components/shops/shop-results-list"
import type { Artist } from "@/types/artist"
import type { Shop } from "@/types/shop"
import { toStyleSlugs } from "@/lib/styles"
import { formatLocation, parseLocation } from "@/lib/parse-location"

type Filters = {
  styles: string[]
  price: string[]
  rating: number
  availableNow: boolean
  query: string
  city: string
  state: string
  zip: string
  sortBy: "rating" | "review_count" | "name"
  radiusMiles: number
}

function filtersFromParams(params: URLSearchParams): Filters {
  // zip / city / state from the URL. Old links and the homepage SearchAction carry
  // only ?q=<place>, which is read as a location (never as a name search).
  let place = {
    zip: params.get("zip") ?? "",
    city: params.get("city") ?? "",
    state: (params.get("state") ?? "").toUpperCase(),
  }
  const q = params.get("q") ?? ""
  if (!place.zip && !place.city && !place.state && q) {
    const parsed = parseLocation(q)
    place = { zip: parsed?.zip ?? "", city: parsed?.city ?? "", state: parsed?.state ?? "" }
  }
  return {
    // Slugs; old links may carry names ("Fine Line") — mapped to slugs.
    styles: toStyleSlugs(params.get("styles")?.split(",").filter(Boolean) ?? []),
    // TODO: Re-enable when claimed artists set their own price tier.
    price: [],
    rating: Number(params.get("rating")) || 0,
    availableNow: params.get("availableNow") === "true",
    query: params.get("query") ?? "",
    ...place,
    sortBy: "rating",
    radiusMiles: 25,
  }
}

export function SearchInterface() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(searchParams))
  const [artists, setArtists] = useState<Artist[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("artists")

  const handleFilterChange = useCallback(
    (newFilters: Filters) => {
      setFilters(newFilters)
      const params = new URLSearchParams()
      if (newFilters.zip) params.set("zip", newFilters.zip)
      if (newFilters.city) params.set("city", newFilters.city)
      if (newFilters.state) params.set("state", newFilters.state)
      if (newFilters.query) params.set("query", newFilters.query)
      if (newFilters.styles.length > 0) params.set("styles", newFilters.styles.join(","))
      if (newFilters.price.length > 0) params.set("price", newFilters.price.join(","))
      if (newFilters.rating > 0) params.set("rating", newFilters.rating.toString())
      if (newFilters.availableNow) params.set("availableNow", "true")
      router.replace(`/search?${params.toString()}`, { scroll: false })
    },
    [router],
  )

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true)

      // Artist params
      const artistParams = new URLSearchParams()
      if (filters.styles.length > 0) artistParams.set("styles", filters.styles.join(","))
      if (filters.price.length > 0) artistParams.set("price", filters.price.join(","))
      if (filters.rating > 0) artistParams.set("rating", filters.rating.toString())
      if (filters.availableNow) artistParams.set("availableNow", "true")

      // Shop params — map artist-centric keys to shop equivalents
      const shopParams = new URLSearchParams()
      if (filters.styles.length > 0) shopParams.set("styles", filters.styles.join(","))
      if (filters.rating > 0) shopParams.set("rating", filters.rating.toString())
      if (filters.availableNow) shopParams.set("acceptsWalkIns", "true")

      // Location and name filters go to both APIs. City is matched exactly when a
      // state is given too, so "Charlotte, NC" doesn't include Port Charlotte.
      for (const p of [artistParams, shopParams]) {
        if (filters.zip) p.set("zip", filters.zip.trim())
        if (filters.city) p.set("city", filters.city.trim())
        if (filters.state) p.set("state", filters.state)
        if (filters.city && filters.state) p.set("exactCity", "1")
        if (filters.query) p.set("query", filters.query.trim())
      }

      try {
        const [artistsRes, shopsRes] = await Promise.all([
          fetch(`/api/artists?${artistParams.toString()}`),
          fetch(`/api/shops?${shopParams.toString()}`),
        ])
        const artistsJson = artistsRes.ok ? await artistsRes.json() : { data: [] }
        setArtists(Array.isArray(artistsJson) ? artistsJson : (artistsJson.data ?? []))
        const shopsJson = shopsRes.ok ? await shopsRes.json() : []
        setShops(Array.isArray(shopsJson) ? shopsJson : (shopsJson.data ?? []))
      } catch {
        setArtists([])
        setShops([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAll()
  }, [filters])

  const place = formatLocation({ zip: filters.zip.trim(), city: filters.city.trim(), state: filters.state })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1">
        <FilterSidebar filters={filters} onFilterChange={handleFilterChange} />
      </div>

      <div className="lg:col-span-3 space-y-6">
        {place && (
          <p className="text-sm text-muted-foreground">
            Results near <span className="font-semibold text-foreground">{place}</span>
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
            <ResultsList
              artists={artists}
              isLoading={isLoading}
              page={0}
              totalCount={artists.length}
              pageSize={artists.length || 24}
              onPageChange={() => {}}
              emptyMessage={place ? `No artists found near ${place}. Try a nearby city or a different style.` : undefined}
            />
          </TabsContent>

          <TabsContent value="shops" className="mt-6">
            <ShopResultsList
              shops={shops}
              isLoading={isLoading}
              emptyMessage={place ? `No shops found near ${place}. Try a nearby city or a different style.` : undefined}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
