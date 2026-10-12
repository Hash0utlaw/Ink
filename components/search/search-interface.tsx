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
import { FinderCta } from "@/components/layout/finder-cta"
import { FilterDrawer } from "@/components/listings/filter-drawer"
import { ListingHeader, countLabel } from "@/components/listings/listing-header"

const PAGE_SIZE = 24

type Results = { artists: Artist[]; artistCount: number; shops: Shop[]; shopCount: number }

const TAB =
  "min-h-11 rounded border-1.5 border-ink bg-vellum tex-vellum px-4 text-[15px] font-semibold text-ink data-[state=active]:bg-ink data-[state=active]:text-vellum data-[state=active]:shadow-none"

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

export function SearchInterface({ showAvailableNow = false }: { showAvailableNow?: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(searchParams))
  const [results, setResults] = useState<Results>({ artists: [], artistCount: 0, shops: [], shopCount: 0 })
  const [artistPage, setArtistPage] = useState(0)
  const [shopPage, setShopPage] = useState(0)
  // Set when the typed "place" matched nothing and was searched as a name instead.
  const [nameTerm, setNameTerm] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("artists")

  const handleFilterChange = useCallback(
    (newFilters: Filters) => {
      setFilters(newFilters)
      setArtistPage(0)
      setShopPage(0)
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
    let cancelled = false

    async function fetchBoth(f: Filters): Promise<Results> {
      // Artist params
      const artistParams = new URLSearchParams()
      if (f.styles.length > 0) artistParams.set("styles", f.styles.join(","))
      if (f.price.length > 0) artistParams.set("price", f.price.join(","))
      if (f.rating > 0) artistParams.set("rating", f.rating.toString())
      if (f.availableNow) artistParams.set("availableNow", "true")
      artistParams.set("sortBy", f.sortBy)
      artistParams.set("page", String(artistPage))

      // Shop params — map artist-centric keys to shop equivalents
      const shopParams = new URLSearchParams()
      if (f.styles.length > 0) shopParams.set("styles", f.styles.join(","))
      if (f.rating > 0) shopParams.set("rating", f.rating.toString())
      if (f.availableNow) shopParams.set("acceptsWalkIns", "true")
      shopParams.set("page", String(shopPage))

      // Location and name filters go to both APIs. City is matched exactly when a
      // state is given too, so "Charlotte, NC" doesn't include Port Charlotte.
      for (const p of [artistParams, shopParams]) {
        if (f.zip) p.set("zip", f.zip.trim())
        if (f.city) p.set("city", f.city.trim())
        if (f.state) p.set("state", f.state)
        if (f.city && f.state) p.set("exactCity", "1")
        if (f.query) p.set("query", f.query.trim())
      }

      const [artistsRes, shopsRes] = await Promise.all([
        fetch(`/api/artists?${artistParams.toString()}`),
        fetch(`/api/shops?${shopParams.toString()}`),
      ])
      const artistsJson = artistsRes.ok ? await artistsRes.json() : { data: [], count: 0 }
      const shopsJson = shopsRes.ok ? await shopsRes.json() : { data: [], count: 0 }
      const artists: Artist[] = Array.isArray(artistsJson) ? artistsJson : (artistsJson.data ?? [])
      const shops: Shop[] = Array.isArray(shopsJson) ? shopsJson : (shopsJson.data ?? [])
      return {
        artists,
        // The API's total, not the length of this page.
        artistCount: Array.isArray(artistsJson) ? artists.length : (artistsJson.count ?? artists.length),
        shops,
        shopCount: Array.isArray(shopsJson) ? shops.length : (shopsJson.count ?? shops.length),
      }
    }

    const fetchAll = async () => {
      setIsLoading(true)
      try {
        let next = await fetchBoth(filters)
        let term: string | null = null
        // A typed term that matches no place ("Black Cloud") is searched as a shop or
        // artist name instead (server-side ilike, active only), within the state if one was given.
        const onlyPlace =
          !filters.zip && !filters.query && filters.styles.length === 0 && filters.rating === 0 && !filters.availableNow
        if (filters.city && onlyPlace && next.artistCount === 0 && next.shopCount === 0) {
          next = await fetchBoth({ ...filters, city: "", query: filters.city })
          term = filters.city
        }
        if (cancelled) return
        setResults(next)
        setNameTerm(term)
        // Only shops matched (e.g. a shop's name): open the Shops tab.
        if (next.artistCount === 0 && next.shopCount > 0) setActiveTab("shops")
      } catch {
        if (cancelled) return
        setResults({ artists: [], artistCount: 0, shops: [], shopCount: 0 })
        setNameTerm(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchAll()
    return () => {
      cancelled = true
    }
  }, [filters, artistPage, shopPage])

  const place = formatLocation({ zip: filters.zip.trim(), city: filters.city.trim(), state: filters.state })

  const where = nameTerm && filters.state ? formatLocation({ state: filters.state }) : ""
  const activeCount =
    [filters.query, filters.zip, filters.state, filters.city].filter(Boolean).length +
    (filters.rating > 0 ? 1 : 0) +
    (filters.availableNow ? 1 : 0) +
    filters.styles.length

  return (
    <div>
      <ListingHeader
        title="Search results"
        place={nameTerm ? undefined : place}
        suffix={
          nameTerm ? (
            <>
              for &ldquo;{nameTerm}&rdquo;
              {where && (
                <>
                  {" "}
                  in <span className="font-place italic">{where}</span>
                </>
              )}
            </>
          ) : undefined
        }
        countLine={
          isLoading ? null : `${countLabel(results.artistCount, "artist")} and ${countLabel(results.shopCount, "shop")}`
        }
      >
        <div className="mt-3">
          <FinderCta variant="inline" />
        </div>
      </ListingHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
        <aside aria-label="Filters" className="lg:sticky lg:top-20 lg:self-start">
          <FilterDrawer
            resultLabel={
              isLoading
                ? null
                : `Show ${countLabel(activeTab === "shops" ? results.shopCount : results.artistCount, "result")}`
            }
            activeCount={activeCount}
          >
            <FilterSidebar filters={filters} onFilterChange={handleFilterChange} showAvailableNow={showAvailableNow} />
          </FilterDrawer>
        </aside>

        <div className="min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-auto gap-2 bg-transparent p-0">
              <TabsTrigger value="artists" className={TAB}>
                {isLoading ? "Artists" : countLabel(results.artistCount, "artist")}
              </TabsTrigger>
              <TabsTrigger value="shops" className={TAB}>
                {isLoading ? "Shops" : countLabel(results.shopCount, "shop")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="artists" className="mt-6">
              <ResultsList
                artists={results.artists}
                isLoading={isLoading}
                page={artistPage}
                totalCount={results.artistCount}
                pageSize={PAGE_SIZE}
                onPageChange={setArtistPage}
                emptyMessage={
                  nameTerm
                    ? `No artists named "${nameTerm}". Try the Shops tab, a city or a different spelling.`
                    : place
                      ? `No artists found near ${place}. Try a nearby city or a different style.`
                      : undefined
                }
              />
            </TabsContent>

            <TabsContent value="shops" className="mt-6">
              <ShopResultsList
                shops={results.shops}
                isLoading={isLoading}
                page={shopPage}
                totalPages={Math.ceil(results.shopCount / PAGE_SIZE)}
                onPageChange={setShopPage}
                emptyMessage={
                  nameTerm
                    ? `No shops named "${nameTerm}". Try a city or a different spelling.`
                    : place
                      ? `No shops found near ${place}. Try a nearby city or a different style.`
                      : undefined
                }
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
