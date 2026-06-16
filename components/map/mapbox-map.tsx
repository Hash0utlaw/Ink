"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { type MapboxLocation, defaultMapConfig, mapStyles } from "@/lib/mapbox"
import { createRoot } from "react-dom/client"
import { MapMarkerPopup } from "./map-marker-popup"

interface MapboxMapProps {
  accessToken: string
  locations: MapboxLocation[]
  selectedLocation: MapboxLocation | null
  onLocationSelect: (location: MapboxLocation | null) => void
  center?: [number, number]
  zoom?: number
  style?: keyof typeof mapStyles
  onMapLoad?: (map: any) => void
  className?: string
}

export function MapboxMap({
  accessToken,
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
  const map = useRef<any>(null)
  const markers = useRef<{ [key: string]: any }>({})
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapboxLoaded, setMapboxLoaded] = useState(false)

  useEffect(() => {
    const loadMapbox = () => {
      // Check if already loaded
      if (window.mapboxgl) {
        setMapboxLoaded(true)
        return
      }

      // Load CSS
      const cssLink = document.createElement("link")
      cssLink.rel = "stylesheet"
      cssLink.href = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css"
      document.head.appendChild(cssLink)

      // Load JS
      const script = document.createElement("script")
      script.src = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"
      script.onload = () => {
        setMapboxLoaded(true)
      }
      script.onerror = (error) => {
        console.error("Failed to load Mapbox GL:", error)
      }
      document.head.appendChild(script)
    }

    loadMapbox()
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !accessToken || !mapboxLoaded || !window.mapboxgl) return

    window.mapboxgl.accessToken = accessToken

    map.current = new window.mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyles[style],
      center,
      zoom,
      attributionControl: false,
    })

    // Add navigation controls
    map.current.addControl(new window.mapboxgl.NavigationControl(), "top-right")

    // Add geolocate control
    map.current.addControl(
      new window.mapboxgl.GeolocateControl({
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
      new window.mapboxgl.AttributionControl({
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
  }, [accessToken, style, center, zoom, onMapLoad, mapboxLoaded])

  // Update map style
  useEffect(() => {
    if (map.current && mapLoaded && window.mapboxgl) {
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

  // Color-code markers by tattoo style
  const getStyleColor = (specialties: string[]): string => {
    const STYLE_COLORS: Record<string, string> = {
      traditional:       "#e85d04",
      japanese:          "#7b2d8b",
      "fine line":       "#0ea5e9",
      realism:           "#16a34a",
      blackwork:         "#1c1917",
      watercolor:        "#ec4899",
      geometric:         "#6366f1",
      "neo-traditional": "#f59e0b",
      portrait:          "#0891b2",
      tribal:            "#92400e",
      minimalist:        "#64748b",
      abstract:          "#d97706",
    }
    const primary = (specialties[0] ?? "").toLowerCase()
    for (const [key, color] of Object.entries(STYLE_COLORS)) {
      if (primary.includes(key)) return color
    }
    return "#8B1538" // app accent fallback
  }

  // Create marker element
  const createMarkerElement = useCallback(
    (location: MapboxLocation) => {
      const isSelected = selectedLocation?.id === location.id
      const color = getStyleColor(location.specialties)
      const isShop = location.type === "shop"

      const el = document.createElement("div")
      el.className = `ink-marker ink-marker--${location.type}`

      const size = isShop ? "32px" : "26px"
      const radius = isShop ? "6px" : "50%"
      const label = isShop
        ? "●"
        : (location.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "✦")

      el.style.cssText = `
        width: ${size};
        height: ${size};
        border-radius: ${radius};
        background: ${color};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isShop ? "14px" : "9px"};
        font-weight: 700;
        color: white;
        border: 2px solid white;
        box-shadow: ${isSelected ? `0 0 0 3px ${color}, 0 4px 16px rgba(0,0,0,0.4)` : "0 2px 8px rgba(0,0,0,0.3)"};
        transition: all 0.15s ease;
        letter-spacing: -0.5px;
        transform: ${isSelected ? "scale(1.25)" : "scale(1)"};
        z-index: ${isSelected ? "1001" : "1"};
      `
      el.textContent = label

      el.addEventListener("mouseenter", () => {
        if (selectedLocation?.id !== location.id) {
          el.style.transform = "scale(1.15)"
          el.style.zIndex = "999"
        }
      })
      el.addEventListener("mouseleave", () => {
        if (selectedLocation?.id !== location.id) {
          el.style.transform = "scale(1)"
          el.style.zIndex = "1"
        }
      })

      return el
    },
    [selectedLocation],
  )

  // Update markers
  useEffect(() => {
    if (!map.current || !mapLoaded || !window.mapboxgl) return

    // Clear existing markers
    Object.values(markers.current).forEach((marker) => marker.remove())
    markers.current = {}

    // Add new markers
    locations.forEach((location) => {
      const el = createMarkerElement(location)

      const marker = new window.mapboxgl.Marker(el).setLngLat(location.coordinates).addTo(map.current!)

      // Create popup
      const popupContainer = document.createElement("div")
      const root = createRoot(popupContainer)
      root.render(<MapMarkerPopup location={location} />)

      const popup = new window.mapboxgl.Popup({
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
      const bg = el.style.background || "#8B1538"
      if (selectedLocation?.id === id) {
        el.style.transform = "scale(1.25)"
        el.style.zIndex = "1001"
        el.style.boxShadow = `0 0 0 3px ${bg}, 0 4px 16px rgba(0,0,0,0.4)`
      } else {
        el.style.transform = "scale(1)"
        el.style.zIndex = "1"
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)"
      }
    })
  }, [selectedLocation])

  // Fit bounds to show all locations
  const fitBounds = useCallback(() => {
    if (!map.current || !mapLoaded || locations.length === 0 || !window.mapboxgl) return

    const bounds = new window.mapboxgl.LngLatBounds()
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
      {(!mapLoaded || !mapboxLoaded) && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">{!mapboxLoaded ? "Loading Mapbox..." : "Loading map..."}</p>
          </div>
        </div>
      )}

      {/* Map controls overlay */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={fitBounds}
          className="bg-white hover:bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors"
          disabled={!mapLoaded || !mapboxLoaded}
        >
          Show All
        </button>
      </div>
    </div>
  )
}

declare global {
  interface Window {
    mapboxgl: any
  }
}
