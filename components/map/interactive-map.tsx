"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { MapboxLocation } from "@/lib/mapbox"
import { MapPin, Star, Clock, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface InteractiveMapProps {
  locations: MapboxLocation[]
  selectedLocation: MapboxLocation | null
  onLocationSelect: (location: MapboxLocation | null) => void
  center?: [number, number]
  zoom?: number
  style?: string
  onMapLoad?: () => void
  className?: string
}

export function InteractiveMap({
  locations,
  selectedLocation,
  onLocationSelect,
  center = [-74.006, 40.7128],
  zoom = 12,
  style = "streets",
  onMapLoad,
  className = "",
}: InteractiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [currentCenter, setCurrentCenter] = useState(center)
  const [currentZoom, setCurrentZoom] = useState(zoom)
  const [hoveredLocation, setHoveredLocation] = useState<MapboxLocation | null>(null)

  // Initialize map
  useEffect(() => {
    const timer = setTimeout(() => {
      setMapLoaded(true)
      onMapLoad?.()
    }, 1000)

    return () => clearTimeout(timer)
  }, [onMapLoad])

  // Update map center and zoom
  useEffect(() => {
    setCurrentCenter(center)
    setCurrentZoom(zoom)
  }, [center, zoom])

  // Calculate marker position based on coordinates
  const getMarkerPosition = useCallback(
    (coordinates: [number, number]) => {
      if (!mapContainer.current) return { x: 0, y: 0 }

      const mapBounds = mapContainer.current.getBoundingClientRect()
      const mapWidth = mapBounds.width
      const mapHeight = mapBounds.height

      // Simple projection calculation (this would be more complex in real Mapbox)
      const [lng, lat] = coordinates
      const [centerLng, centerLat] = currentCenter

      // Calculate relative position
      const lngDiff = lng - centerLng
      const latDiff = lat - centerLat

      // Convert to pixel coordinates (simplified)
      const zoomFactor = Math.pow(2, currentZoom - 10)
      const x = mapWidth / 2 + lngDiff * zoomFactor * 1000
      const y = mapHeight / 2 - latDiff * zoomFactor * 1000

      return { x, y }
    },
    [currentCenter, currentZoom],
  )

  // Fit bounds to show all locations
  const fitBounds = useCallback(() => {
    if (locations.length === 0) return

    const lngs = locations.map((loc) => loc.coordinates[0])
    const lats = locations.map((loc) => loc.coordinates[1])

    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    const centerLng = (minLng + maxLng) / 2
    const centerLat = (minLat + maxLat) / 2

    setCurrentCenter([centerLng, centerLat])
    setCurrentZoom(11)
  }, [locations])

  // Zoom controls
  const zoomIn = () => setCurrentZoom((prev) => Math.min(prev + 1, 18))
  const zoomOut = () => setCurrentZoom((prev) => Math.max(prev - 1, 1))
  const resetView = () => {
    setCurrentCenter([-74.006, 40.7128])
    setCurrentZoom(12)
  }

  return (
    <div className={`relative w-full h-full bg-gray-100 overflow-hidden ${className}`}>
      {/* Map Background */}
      <div
        ref={mapContainer}
        className="w-full h-full relative"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23e5e7eb' fillOpacity='0.4'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: style === "satellite" ? "#2a2a2a" : style === "dark" ? "#1a1a1a" : "#f3f4f6",
        }}
      >
        {/* Street grid overlay */}
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%" className="text-gray-400">
            <defs>
              <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Location Markers */}
        {mapLoaded &&
          locations.map((location) => {
            const position = getMarkerPosition(location.coordinates)
            const isSelected = selectedLocation?.id === location.id
            const isHovered = hoveredLocation?.id === location.id

            return (
              <div
                key={location.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 z-10 ${
                  isSelected ? "scale-125 z-20" : isHovered ? "scale-110 z-15" : ""
                }`}
                style={{
                  left: `${Math.max(20, Math.min(position.x, mapContainer.current?.clientWidth || 0 - 20))}px`,
                  top: `${Math.max(20, Math.min(position.y, mapContainer.current?.clientHeight || 0 - 20))}px`,
                }}
                onClick={() => onLocationSelect(location)}
                onMouseEnter={() => setHoveredLocation(location)}
                onMouseLeave={() => setHoveredLocation(null)}
              >
                {/* Marker */}
                <div
                  className={`
                w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm
                border-3 border-white shadow-lg transition-all duration-200
                ${location.type === "artist" ? "bg-burgundy-500" : "bg-blue-600"}
                ${isSelected ? "ring-4 ring-yellow-400 ring-opacity-50" : ""}
              `}
                >
                  {location.type === "artist" ? "🎨" : "🏪"}
                </div>

                {/* Hover Tooltip */}
                {isHovered && !isSelected && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black bg-opacity-90 text-white text-xs rounded-lg whitespace-nowrap">
                    <div className="font-semibold">{location.name}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{location.rating}</span>
                      <span className="text-gray-300">({location.reviewCount})</span>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black border-t-opacity-90"></div>
                  </div>
                )}
              </div>
            )
          })}

        {/* Selected Location Details */}
        {selectedLocation && (
          <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-xl p-4 max-w-sm mx-auto z-30">
            <div className="flex items-start gap-3">
              <img
                src={selectedLocation.image || "/placeholder.svg"}
                alt={selectedLocation.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{selectedLocation.name}</h3>
                  <Badge variant={selectedLocation.type === "artist" ? "default" : "secondary"}>
                    {selectedLocation.type}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{selectedLocation.rating}</span>
                  <span className="text-sm text-gray-500">({selectedLocation.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{selectedLocation.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4" />
                  <span className={selectedLocation.isOpen ? "text-green-600" : "text-red-600"}>
                    {selectedLocation.isOpen ? "Open Now" : "Closed"}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLocationSelect(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-40">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
        <Button variant="outline" size="sm" onClick={zoomIn} className="bg-white hover:bg-gray-50 w-10 h-10 p-0">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={zoomOut} className="bg-white hover:bg-gray-50 w-10 h-10 p-0">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={resetView} className="bg-white hover:bg-gray-50 w-10 h-10 p-0">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Show All Button */}
      <div className="absolute top-4 left-4 z-30">
        <Button onClick={fitBounds} variant="outline" size="sm" className="bg-white hover:bg-gray-50">
          Show All
        </Button>
      </div>

      {/* Map Style Indicator */}
      <div className="absolute bottom-4 right-4 z-30">
        <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">{style} view</div>
      </div>
    </div>
  )
}
