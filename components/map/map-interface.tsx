"use client"

import { useState, useEffect, useCallback } from "react"
import { MapboxMap } from "./mapbox-map"
import { MapSidebar } from "./map-sidebar"
import { LocationDetails } from "./location-details"
import { mockLocations, getMapLocations } from "@/lib/mock-data"
import type { MapboxLocation } from "@/lib/mapbox"
import { calculateDistance, getCurrentLocation, geocodeAddress, mapboxConfig } from "@/lib/mapbox"

interface MapFilters {
  locationType: "all" | "artist" | "shop"
  styles: string[]
  priceRange: string[]
  rating: number
  radius: number
  availableNow: boolean
  searchQuery: string
}

export function MapInterface() {
  const [locations, setLocations] = useState<MapboxLocation[]>([])
  const [filteredLocations, setFilteredLocations] = useState<MapboxLocation[]>([])
  const [selectedLocation, setSelectedLocation] = useState<MapboxLocation | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([-122.4194, 37.7749])
  const [mapZoom, setMapZoom] = useState(12)
  const [mapStyle, setMapStyle] = useState("streets")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<MapFilters>({
    locationType: "all",
    styles: [],
    priceRange: [],
    rating: 0,
    radius: 25,
    availableNow: false,
    searchQuery: "",
  })

  // Load locations on mount
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLoading(true)
        const data = await getMapLocations()
        setLocations(data)
        setFilteredLocations(data)
      } catch (error) {
        console.error("Failed to load locations:", error)
        setLocations(mockLocations)
        setFilteredLocations(mockLocations)
      } finally {
        setLoading(false)
      }
    }

    loadLocations()
  }, [])

  // Get user location
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const coords = await getCurrentLocation()
        setUserLocation(coords)

        // Update distances for all locations
        const updatedLocations = locations.map((location) => ({
          ...location,
          distance: calculateDistance(coords, location.coordinates),
        }))
        setLocations(updatedLocations)
      } catch (error) {
        console.warn("Could not get user location:", error)
      }
    }

    if (locations.length > 0) {
      getUserLocation()
    }
  }, [locations.length])

  // Filter locations based on current filters
  useEffect(() => {
    let filtered = [...locations]

    // Filter by location type
    if (filters.locationType !== "all") {
      filtered = filtered.filter((location) => location.type === filters.locationType)
    }

    // Filter by styles
    if (filters.styles.length > 0) {
      filtered = filtered.filter((location) =>
        location.specialties.some((specialty) =>
          filters.styles.some((style) => specialty.toLowerCase().includes(style.toLowerCase())),
        ),
      )
    }

    // Filter by price range
    if (filters.priceRange.length > 0) {
      filtered = filtered.filter((location) => filters.priceRange.includes(location.priceRange))
    }

    // Filter by rating
    if (filters.rating > 0) {
      filtered = filtered.filter((location) => location.rating >= filters.rating)
    }

    // Filter by availability
    if (filters.availableNow) {
      filtered = filtered.filter((location) => location.isOpen)
    }

    // Filter by radius (if user location is available)
    if (userLocation && filters.radius > 0) {
      filtered = filtered.filter((location) => {
        const distance = location.distance || calculateDistance(userLocation, location.coordinates)
        return distance <= filters.radius
      })
    }

    // Filter by search query
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(
        (location) =>
          location.name.toLowerCase().includes(query) ||
          location.address.toLowerCase().includes(query) ||
          location.specialties.some((specialty) => specialty.toLowerCase().includes(query)),
      )
    }

    setFilteredLocations(filtered)
  }, [locations, filters, userLocation])

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
      setUserLocation(coords)
      setMapCenter(coords)
      setMapZoom(14)
    } catch (error) {
      console.error("Failed to get current location:", error)
    }
  }, [])

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<MapFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }, [])

  // Handle location selection
  const handleLocationSelect = useCallback((location: MapboxLocation | null) => {
    setSelectedLocation(location)
    if (location) {
      setMapCenter(location.coordinates)
      setMapZoom(16)
    }
  }, [])

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
        locations={filteredLocations}
        selectedLocation={selectedLocation}
        onLocationSelect={handleLocationSelect}
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        onCurrentLocation={handleCurrentLocation}
        loading={loading}
      />

      {/* Map */}
      <div className="flex-1 relative">
        <MapboxMap
          accessToken={mapboxConfig.accessToken}
          locations={filteredLocations}
          selectedLocation={selectedLocation}
          onLocationSelect={handleLocationSelect}
          center={mapCenter}
          zoom={mapZoom}
          style={mapStyle as keyof typeof import("@/lib/mapbox").mapStyles}
          className="w-full h-full"
        />

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
          <select
            value={mapStyle}
            onChange={(e) => handleMapStyleChange(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
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
