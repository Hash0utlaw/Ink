"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import mapboxgl from "mapbox-gl"
import { type MapboxLocation, defaultMapConfig, mapStyles } from "@/lib/mapbox"
import { createRoot } from "react-dom/client"
import { MapMarkerPopup } from "./map-marker-popup"
import "mapbox-gl/dist/mapbox-gl.css"

interface MapboxMapProps {
  locations: MapboxLocation[]
  selectedLocation: MapboxLocation | null
  onLocationSelect: (location: MapboxLocation | null) => void
  center?: [number, number]
  zoom?: number
  style?: keyof typeof mapStyles
  onMapLoad?: (map: mapboxgl.Map) => void
  className?: string
}

export function MapboxMap({
  locations,
  selectedLocation,
  onLocationSelect,
  center = defaultMapConfig.center,
  zoom = defaultMapConfig.zoom,
  style = "streets",
  onMapLoad,
  className = "",
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({})
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyles[style],
      center,
      zoom,
      attributionControl: false,
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right")

    // Add geolocate control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      "top-right",
    )

    // Add attribution
    map.current.addControl(
      new mapboxgl.AttributionControl({
        customAttribution: "© TattooMaps 2024",
      }),
      "bottom-right",
    )

    map.current.on("load", () => {
      setMapLoaded(true)
      onMapLoad?.(map.current!)
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Update map style
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.setStyle(mapStyles[style])
    }
  }, [style, mapLoaded])

  // Update map center and zoom
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.flyTo({
        center,
        zoom,
        duration: 1000,
      })
    }
  }, [center, zoom, mapLoaded])

  // Create marker element
  const createMarkerElement = useCallback(
    (location: MapboxLocation) => {
      const el = document.createElement("div")
      el.className = `marker marker-${location.type} ${selectedLocation?.id === location.id ? "marker-selected" : ""}`

      // Add custom marker styling
      el.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
      color: white;
      border: 3px solid white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
      background: ${location.type === "artist" ? "#8B1538" : "#1E40AF"};
    `

      // Add icon
      el.innerHTML = location.type === "artist" ? "🎨" : "🏪"

      // Hover effects
      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.1)"
        el.style.zIndex = "1000"
      })

      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)"
        el.style.zIndex = "1"
      })

      return el
    },
    [selectedLocation],
  )

  // Update markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Clear existing markers
    Object.values(markers.current).forEach((marker) => marker.remove())
    markers.current = {}

    // Add new markers
    locations.forEach((location) => {
      const el = createMarkerElement(location)

      const marker = new mapboxgl.Marker(el).setLngLat(location.coordinates).addTo(map.current!)

      // Create popup
      const popupContainer = document.createElement("div")
      const root = createRoot(popupContainer)
      root.render(<MapMarkerPopup location={location} />)

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
      }).setDOMContent(popupContainer)

      marker.setPopup(popup)

      // Click handler
      el.addEventListener("click", (e) => {
        e.stopPropagation()
        onLocationSelect(location)

        // Center map on selected location
        map.current?.flyTo({
          center: location.coordinates,
          zoom: Math.max(map.current.getZoom(), 14),
          duration: 1000,
        })
      })

      markers.current[location.id] = marker
    })
  }, [locations, mapLoaded, createMarkerElement, onLocationSelect])

  // Update selected marker styling
  useEffect(() => {
    Object.entries(markers.current).forEach(([id, marker]) => {
      const el = marker.getElement()
      if (selectedLocation?.id === id) {
        el.classList.add("marker-selected")
        el.style.transform = "scale(1.2)"
        el.style.zIndex = "1001"
        el.style.boxShadow = "0 4px 20px rgba(0,0,0,0.4)"
      } else {
        el.classList.remove("marker-selected")
        el.style.transform = "scale(1)"
        el.style.zIndex = "1"
        el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)"
      }
    })
  }, [selectedLocation])

  // Fit bounds to show all locations
  const fitBounds = useCallback(() => {
    if (!map.current || !mapLoaded || locations.length === 0) return

    const bounds = new mapboxgl.LngLatBounds()
    locations.forEach((location) => {
      bounds.extend(location.coordinates)
    })

    map.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 15,
      duration: 1000,
    })
  }, [locations, mapLoaded])

  // Expose fitBounds method
  useEffect(() => {
    if (mapLoaded && locations.length > 0) {
      // Auto-fit bounds when locations change
      const timer = setTimeout(fitBounds, 500)
      return () => clearTimeout(timer)
    }
  }, [locations, mapLoaded, fitBounds])

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map controls overlay */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={fitBounds}
          className="bg-white hover:bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors"
        >
          Show All
        </button>
      </div>
    </div>
  )
}
