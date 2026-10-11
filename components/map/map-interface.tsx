"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { MapboxMap, UNCLUSTERED_ZOOM, getViewBounds, type MapBounds } from "./mapbox-map"
import { MapSidebar } from "./map-sidebar"
import { LocationDetails } from "./location-details"
import { List } from "lucide-react"
import type { MapboxLocation, MapStyle } from "@/lib/mapbox"
import { NeatlineFrame } from "@/components/brand/neatline-frame"
import { cn } from "@/lib/utils"
import { calculateDistance, getCurrentLocation, geocodePlace, mapboxConfig } from "@/lib/mapbox"
import { useToast } from "@/components/ui/use-toast"
import { styleLabels } from "@/lib/styles"
import { formatLocation, parseLocation } from "@/lib/parse-location"

interface MapFilters {
  locationType: "all" | "artist" | "shop"
  styles: string[]
  priceRange: string[]
  rating: number
  radius: number
  availableNow: boolean
  searchQuery: string
}

// The map loads one compact pin per shop/artist from /api/map/pins, keeps
// them all in the clustered source, and fetches full records from
// /api/map/details only for the top MAX_CARDS pins in view (sidebar) or a
// clicked pin (LocationDetails).
const MAX_CARDS = 100
// The first PIN_NUMBERS list rows are numbered, with the same number on their
// map pin. Only from UNCLUSTERED_ZOOM: below it a numbered pin could be
// hidden inside a cluster seal.
const PIN_NUMBERS = 9

const MAP_STYLE_OPTIONS: { value: MapStyle; label: string }[] = [
  { value: "chart", label: "Map" },
  { value: "satellite", label: "Satellite" },
]

type Pin = [string, number, number, number, string?] // id, lat, lng, rating, primary style slug

// Minimal MapboxLocation for a pin — enough for clustering, colors, filters
// and click lookup; replaced by the full record from /api/map/details.
function pinToLocation(type: "shop" | "artist", [id, lat, lng, rating, primary]: Pin): MapboxLocation {
  return {
    id: `${type}-${id}`,
    name: "",
    type,
    coordinates: [lng, lat],
    address: "",
    rating,
    reviewCount: 0,
    isOpen: false,
    styles: primary ? [primary] : [],
    priceRange: "medium",
  }
}

// "shop-<uuid>" → ["shop", "<uuid>"]
function splitId(id: string): ["shop" | "artist", string] {
  const dash = id.indexOf("-")
  return [id.slice(0, dash) as "shop" | "artist", id.slice(dash + 1)]
}

async function fetchDetails(ids: string[]): Promise<MapboxLocation[]> {
  const shops: string[] = []
  const artists: string[] = []
  for (const id of ids) {
    const [type, raw] = splitId(id)
    ;(type === "shop" ? shops : artists).push(raw)
  }
  const params = new URLSearchParams()
  if (shops.length) params.set("shops", shops.join(","))
  if (artists.length) params.set("artists", artists.join(","))
  const res = await fetch(`/api/map/details?${params}`)
  if (!res.ok) throw new Error(`details ${res.status}`)
  const json = await res.json()
  return (json.data ?? []) as MapboxLocation[]
}

export function MapInterface() {
  const { toast } = useToast()
  // Every pin (stub locations), and full records fetched so far, by id.
  const [pins, setPins] = useState<MapboxLocation[]>([])
  const detailsCacheRef = useRef<Map<string, MapboxLocation>>(new Map())
  // Sidebar: full records for the top-rated pins in view, and in-view counts.
  const [cards, setCards] = useState<MapboxLocation[]>([])
  const [inView, setInView] = useState<{ shops: number; artists: number } | null>(null)
  const [bounds, setBounds] = useState<MapBounds | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<MapboxLocation | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([-98.5795, 39.8283])
  const [mapZoom, setMapZoom] = useState(4)
  const [mapStyle, setMapStyle] = useState<MapStyle>("chart")
  // The query, when it geocoded to a place (for the sidebar heading).
  const [searchedPlace, setSearchedPlace] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [filters, setFilters] = useState<MapFilters>({
    locationType: "all",
    styles: [],
    priceRange: [],
    rating: 0,
    radius: 25,
    availableNow: false,
    searchQuery: "",
  })

  // Load all pins once, and again when the style filter changes (it narrows
  // artists server-side; shops are unaffected).
  const stylesKey = filters.styles.join(",")
  useEffect(() => {
    let cancelled = false
    const loadPins = async () => {
      try {
        setDataError(null)
        const res = await fetch(stylesKey ? `/api/map/pins?styles=${encodeURIComponent(stylesKey)}` : "/api/map/pins")
        if (!res.ok) {
          if (!cancelled) {
            setDataError(`Couldn't load shops (error ${res.status})`)
            setLoading(false)
          }
          return
        }
        const json = await res.json()
        if (cancelled) return
        setPins([
          ...((json.shops ?? []) as Pin[]).map((p) => pinToLocation("shop", p)),
          ...((json.artists ?? []) as Pin[]).map((p) => pinToLocation("artist", p)),
        ])
      } catch (error) {
        console.error("Failed to load map pins:", error)
        if (!cancelled) {
          setDataError("Couldn't load shops — check your connection")
          setLoading(false)
        }
      }
    }
    loadPins()
    return () => {
      cancelled = true
    }
  }, [stylesKey])

  // On mobile the sidebar is a full-width overlay (see map-sidebar.tsx), so
  // default it closed there — otherwise the map itself would be completely
  // hidden behind it on first load. Desktop keeps its existing default-open
  // side panel. A one-time check at mount, not a live media query: the user
  // can always toggle afterward regardless of width.
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }, [])

  // Viewport bounds, debounced on the map's moveend. No refetch — visible
  // pins are computed client-side from the full pin set below.
  const moveEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMoveEnd = useCallback((next: MapBounds) => {
    if (moveEndTimerRef.current) clearTimeout(moveEndTimerRef.current)
    moveEndTimerRef.current = setTimeout(() => setBounds(next), 300)
  }, [])

  const handleMapLoad = useCallback((map: any) => {
    setBounds(getViewBounds(map))
  }, [])

  useEffect(() => {
    return () => {
      if (moveEndTimerRef.current) clearTimeout(moveEndTimerRef.current)
    }
  }, [])

  // Pins after the filters that pins carry data for (type, rating, radius).
  // The map clusters all of these.
  const mapPins = useMemo(() => {
    return pins.filter((pin) => {
      if (filters.locationType !== "all" && pin.type !== filters.locationType) return false
      if (filters.rating > 0 && pin.rating < filters.rating) return false
      if (userLocation && filters.radius > 0 && calculateDistance(userLocation, pin.coordinates) > filters.radius) return false
      return true
    })
  }, [pins, filters.locationType, filters.rating, filters.radius, userLocation])

  // Pins in view → counts + top MAX_CARDS by rating → fetch any uncached
  // details → sidebar cards. Stale responses are dropped via requestRef.
  const requestRef = useRef(0)
  useEffect(() => {
    if (pins.length === 0) return
    const visible = bounds
      ? mapPins.filter(({ coordinates: [lng, lat] }) =>
          lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east
        )
      : mapPins
    let shops = 0
    for (const p of visible) if (p.type === "shop") shops++
    setInView({ shops, artists: visible.length - shops })

    const top = [...visible].sort((a, b) => b.rating - a.rating).slice(0, MAX_CARDS)
    const missing = top.map((p) => p.id).filter((id) => !detailsCacheRef.current.has(id))
    const request = ++requestRef.current
    const show = () => {
      if (request !== requestRef.current) return
      setCards(top.map((p) => detailsCacheRef.current.get(p.id)).filter((l): l is MapboxLocation => !!l))
      setLoading(false)
    }
    if (missing.length === 0) {
      show()
      return
    }
    fetchDetails(missing)
      .then((rows) => {
        for (const row of rows) detailsCacheRef.current.set(row.id, row)
        setDataError(null)
        show()
      })
      .catch((error) => {
        console.error("Failed to load location details:", error)
        if (request === requestRef.current) {
          setDataError("Couldn't load shops — check your connection")
          setLoading(false)
        }
      })
  }, [pins.length, mapPins, bounds])

  // Filters that need full records (search, price, availability) apply to
  // the cards only.
  const filteredCards = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase()
    return cards.filter((location) => {
      if (filters.priceRange.length > 0 && !filters.priceRange.includes(location.priceRange)) return false
      if (filters.availableNow && !location.isOpen) return false
      if (
        query &&
        !location.name.toLowerCase().includes(query) &&
        !location.address.toLowerCase().includes(query) &&
        !styleLabels(location.styles).some((label) => label.toLowerCase().includes(query))
      )
        return false
      return true
    })
  }, [cards, filters.priceRange, filters.availableNow, filters.searchQuery])

  // The sidebar list, best rated first; its first rows are numbered on the map.
  const listed = useMemo(
    () => [...filteredCards].sort((a, b) => b.rating - a.rating).slice(0, MAX_CARDS),
    [filteredCards]
  )
  // Keyed on the ids so the map only re-sets its data when the numbering changes.
  const numbered = bounds != null && bounds.zoom >= UNCLUSTERED_ZOOM
  const numberedKey = numbered
    ? listed
        .slice(0, PIN_NUMBERS)
        .map((location) => location.id)
        .join(",")
    : ""
  const pinNumbers = useMemo(
    () => new Map(numberedKey ? numberedKey.split(",").map((id, i) => [id, i + 1]) : []),
    [numberedKey]
  )

  // Search: a place moves the map there and leaves the list unfiltered; any
  // other text (a shop name, a style) filters the list in view by name,
  // address and style without moving the map.
  const handleSearch = useCallback(async (query: string) => {
    const text = query.trim()
    setSearchedPlace(null)
    if (!text) {
      setFilters((prev) => ({ ...prev, searchQuery: "" }))
      return
    }

    // With a ZIP or a state it's a place. A city alone ("Charlotte") counts only
    // when Mapbox knows a US city by exactly that name, so "Black Cloud" stays text.
    const parsed = parseLocation(text)
    let place: Awaited<ReturnType<typeof geocodePlace>> = null
    if (parsed && (parsed.zip || parsed.state)) {
      place = await geocodePlace(text)
    } else if (parsed?.city) {
      const hit = await geocodePlace(text)
      if (hit && ["place", "locality"].includes(hit.type) && hit.name.toLowerCase() === parsed.city.toLowerCase()) {
        place = hit
      }
    }

    if (place && parsed) {
      setFilters((prev) => ({ ...prev, searchQuery: "" }))
      setMapCenter(place.center)
      setMapZoom(14)
      // The heading shows the parsed place ("charlotte nc" → "Charlotte, NC").
      setSearchedPlace(formatLocation(parsed) || text)
    } else {
      setFilters((prev) => ({ ...prev, searchQuery: text }))
    }
  }, [])

  // Handle current location
  const handleCurrentLocation = useCallback(async () => {
    try {
      const coords = await getCurrentLocation()
      if (!coords) {
        toast({ description: "Location not available" })
        return
      }
      setUserLocation(coords)
      setMapCenter(coords)
      setMapZoom(14)
    } catch (error) {
      console.error("Failed to get current location:", error)
      toast({ description: "Location not available" })
    }
  }, [toast])

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<MapFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }, [])

  // Handle location selection. Map clicks pass a pin stub; its full record
  // is fetched (once) before LocationDetails opens.
  const handleLocationSelect = useCallback(
    async (location: MapboxLocation | null) => {
      if (!location) {
        setSelectedLocation(null)
        return
      }
      setMapCenter(location.coordinates)
      setMapZoom(16)
      const cached = detailsCacheRef.current.get(location.id)
      if (cached) {
        setSelectedLocation(cached)
        return
      }
      try {
        const [full] = await fetchDetails([location.id])
        if (!full) throw new Error("not found")
        detailsCacheRef.current.set(full.id, full)
        setSelectedLocation(full)
      } catch (error) {
        console.error("Failed to load location details:", error)
        toast({ description: "Couldn't load details for this location" })
      }
    },
    [toast]
  )

  // Handle map style change
  const handleMapStyleChange = useCallback((style: MapStyle) => {
    setMapStyle(style)
  }, [])

  // Fills the screen below the admin banner (the only bar /map shows; it sets
  // --admin-banner-h while visible). dvh tracks mobile browser chrome.
  return (
    <div className="relative flex h-[calc(100dvh-var(--admin-banner-h,0px))]">
      {/* Sidebar */}
      <MapSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        locations={listed}
        pinNumbers={pinNumbers}
        place={searchedPlace}
        totals={inView}
        selectedLocation={selectedLocation}
        onLocationSelect={handleLocationSelect}
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        onCurrentLocation={handleCurrentLocation}
        loading={loading}
        dataError={dataError}
      />

      {/* Map: inside the neatline frame from 1024px, edge to edge below */}
      <div className="relative min-w-0 flex-1 bg-paper tex-paper lg:p-4">
        <NeatlineFrame desktopOnly className="h-full">
          <MapboxMap
            accessToken={mapboxConfig.accessToken}
            locations={mapPins}
            selectedLocation={selectedLocation}
            onLocationSelect={handleLocationSelect}
            center={mapCenter}
            zoom={mapZoom}
            style={mapStyle}
            pinNumbers={pinNumbers}
            onMoveEnd={handleMoveEnd}
            onMapLoad={handleMapLoad}
            className="w-full h-full"
          />

          {/* List toggle. On mobile the open list covers the map and has its own "Show map" button. */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-expanded={sidebarOpen}
            className="absolute left-4 top-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-lg border-1.5 border-ink bg-vellum tex-vellum px-3 text-[15px] font-semibold text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <List className="h-4 w-4" aria-hidden="true" />
            {sidebarOpen ? "Hide list" : "Show list"}
          </button>

          {/* Base map toggle */}
          <div
            role="group"
            aria-label="Map style"
            className="absolute right-4 top-4 z-20 flex overflow-hidden rounded-lg border-1.5 border-ink bg-vellum tex-vellum"
          >
            {MAP_STYLE_OPTIONS.map(({ value, label }, i) => (
              <button
                key={value}
                type="button"
                aria-pressed={mapStyle === value}
                onClick={() => handleMapStyleChange(value)}
                className={cn(
                  "min-h-11 px-3 text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  i > 0 && "border-l-1.5 border-ink",
                  mapStyle === value ? "bg-ink text-vellum" : "text-ink hover:bg-secondary"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Selected shop, docked bottom-left (bottom on mobile) */}
          {selectedLocation && (
            <LocationDetails
              location={selectedLocation}
              pinNumber={pinNumbers.get(selectedLocation.id)}
              onClose={() => setSelectedLocation(null)}
            />
          )}
        </NeatlineFrame>
      </div>
    </div>
  )
}
