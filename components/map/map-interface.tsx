"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { MapboxMap, type MapBounds } from "./mapbox-map"
import { MapSidebar } from "./map-sidebar"
import { LocationDetails } from "./location-details"
import type { MapboxLocation } from "@/lib/mapbox"
import { calculateDistance, getCurrentLocation, geocodeAddress, mapboxConfig } from "@/lib/mapbox"
import { useToast } from "@/components/ui/use-toast"

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

type Pin = [string, number, number, number, string?] // id, lat, lng, rating, primary specialty

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
    specialties: primary ? [primary] : [],
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
  const [mapStyle, setMapStyle] = useState("dark")
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

  const handleMapLoad = useCallback((map: { getBounds: () => any }) => {
    const b = map.getBounds()
    setBounds({ west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() })
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
        !location.specialties.some((specialty) => specialty.toLowerCase().includes(query))
      )
        return false
      return true
    })
  }, [cards, filters.priceRange, filters.availableNow, filters.searchQuery])

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }))

    if (query.trim()) {
      try {
        const coords = await geocodeAddress(query)
        if (coords) {
          setMapCenter(coords)
          setMapZoom(14)
        }
      } catch (error) {
        console.warn("Geocoding failed:", error)
      }
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
  const handleMapStyleChange = useCallback((style: string) => {
    setMapStyle(style)
  }, [])

  return (
    <div className="relative h-[calc(100vh-4rem)] flex">
      {/* Sidebar */}
      <MapSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        locations={filteredCards}
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

      {/* Map */}
      <div className="flex-1 relative">
        <MapboxMap
          accessToken={mapboxConfig.accessToken}
          locations={mapPins}
          selectedLocation={selectedLocation}
          onLocationSelect={handleLocationSelect}
          center={mapCenter}
          zoom={mapZoom}
          style={mapStyle as keyof typeof import("@/lib/mapbox").mapStyles}
          onMoveEnd={handleMoveEnd}
          onMapLoad={handleMapLoad}
          className="w-full h-full"
        />

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
          <select
            value={mapStyle}
            onChange={(e) => handleMapStyleChange(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg shadow-sm text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
          >
            <option value="streets">Streets</option>
            <option value="satellite">Satellite</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        {/* Location Details Modal */}
        {selectedLocation && (
          <LocationDetails
            location={selectedLocation}
            isOpen={!!selectedLocation}
            onClose={() => setSelectedLocation(null)}
          />
        )}
      </div>
    </div>
  )
}
