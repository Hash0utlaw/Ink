"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { type MapboxLocation, defaultMapConfig, mapStyles } from "@/lib/mapbox"
import { createRoot } from "react-dom/client"
import { MapMarkerPopup } from "./map-marker-popup"

// Some scraped locations have missing/malformed coordinates. Mapbox's
// LngLatBounds.extend() accepts them silently but throws later inside
// fitBounds()/cameraForBounds(), which can leave the map stuck on its
// loading state — filter these out before they ever reach Mapbox.
function isValidCoordinate(coords: unknown): coords is [number, number] {
  return (
    Array.isArray(coords) &&
    coords.length === 2 &&
    Number.isFinite(coords[0]) &&
    Number.isFinite(coords[1]) &&
    Math.abs(coords[0]) <= 180 &&
    Math.abs(coords[1]) <= 90
  )
}

// Mapbox GL JS is loaded from the CDN at runtime rather than the npm
// package (see package.json) — pin the version here so the JS and CSS
// URLs below can't drift out of sync with each other.
const MAPBOX_GL_VERSION = "3.0.1"

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
  style = "dark",
  onMapLoad,
  className = "",
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markers = useRef<{ [key: string]: any }>({})
  const popupRoots = useRef<{ [key: string]: ReturnType<typeof createRoot> }>({})
  const onMapLoadRef = useRef(onMapLoad)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapboxLoaded, setMapboxLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Bumped on every manual Retry so the watchdog effect below gets a fresh
  // 15s window instead of relying on a timer left over from a prior attempt.
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    onMapLoadRef.current = onMapLoad
  }, [onMapLoad])

  // Extracted out of the effect so handleRetry (below) can re-invoke the exact
  // same loading logic instead of duplicating it.
  const loadMapbox = useCallback(() => {
    // Check if already loaded
    if (window.mapboxgl) {
      setMapboxLoaded(true)
      return
    }

    // Load CSS
    const cssLink = document.createElement("link")
    cssLink.rel = "stylesheet"
    cssLink.href = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css`
    document.head.appendChild(cssLink)

    // Load JS
    const script = document.createElement("script")
    script.src = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js`
    script.onload = () => {
      setMapboxLoaded(true)
    }
    script.onerror = (error) => {
      console.error("Failed to load Mapbox GL:", error)
      setLoadError("Map unavailable — could not reach Mapbox")
    }
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    loadMapbox()
  }, [loadMapbox])

  // Initialize map — must run exactly once per mount. style/center/zoom are
  // intentionally read only as initial values here; later changes are
  // handled by the dedicated style and flyTo effects below instead of
  // tearing down and recreating the whole map.
  useEffect(() => {
    if (map.current || !mapContainer.current || !mapboxLoaded || !window.mapboxgl) return

    if (!accessToken) {
      console.error(
        "Mapbox initialization aborted: NEXT_PUBLIC_MAPBOX_TOKEN is missing or empty. " +
          "Set it in the environment — and rebuild/redeploy if this is production, since " +
          "NEXT_PUBLIC_* variables are inlined at build time — before the map can load."
      )
      setLoadError("Map unavailable — missing configuration")
      return
    }

    window.mapboxgl.accessToken = accessToken

    map.current = new window.mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyles[style],
      center,
      zoom,
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

    map.current.on("error", (e: any) => {
      console.error("Mapbox runtime error:", e?.error ?? e)
      const status = e?.error?.status
      const message: string = e?.error?.message ?? ""
      if (status === 401 || status === 403 || /unauthorized|forbidden/i.test(message)) {
        setLoadError("Map unavailable — invalid configuration")
      }
    })

    map.current.on("load", () => {
      setMapLoaded(true)
      onMapLoadRef.current?.(map.current!)
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, mapboxLoaded])

  // Watchdog: surface a "taking too long" error rather than spinning forever
  // if something stalls the load in a way that produces neither mapLoaded
  // nor its own error. Depends on loadAttempt too so a manual Retry gets its
  // own fresh 15s window rather than relying on a timer from a prior attempt.
  useEffect(() => {
    if (mapLoaded) return
    const timer = setTimeout(() => {
      setLoadError((prev) => prev ?? "Map is taking too long to load")
    }, 15000)
    return () => clearTimeout(timer)
  }, [mapLoaded, loadAttempt])

  const handleRetry = useCallback(() => {
    if (map.current) {
      map.current.remove()
      map.current = null
    }
    setLoadError(null)
    setMapLoaded(false)
    setMapboxLoaded(false)
    setLoadAttempt((n) => n + 1)
    loadMapbox()
  }, [loadMapbox])

  // Unmount any remaining popup React roots when the map itself unmounts
  useEffect(() => {
    return () => {
      Object.values(popupRoots.current).forEach((root) => root.unmount())
      popupRoots.current = {}
    }
  }, [])

  // Update map style
  useEffect(() => {
    if (map.current && mapLoaded && window.mapboxgl) {
      map.current.setStyle(mapStyles[style])
    }
  }, [style, mapLoaded])

  // Fly to updated center/zoom without tearing down the map. Guarded against
  // re-flying on every render by comparing against the map's actual current
  // center/zoom with a small epsilon.
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    const current = map.current.getCenter()
    const epsilon = 0.0001
    const centerChanged =
      Math.abs(current.lng - center[0]) > epsilon || Math.abs(current.lat - center[1]) > epsilon
    const zoomChanged = Math.abs(map.current.getZoom() - zoom) > epsilon
    if (!centerChanged && !zoomChanged) return
    map.current.flyTo({
      center,
      zoom,
      duration: 800,
    })
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

    // Clear existing markers and unmount their popup React roots
    Object.values(markers.current).forEach((marker) => marker.remove())
    markers.current = {}
    Object.values(popupRoots.current).forEach((root) => root.unmount())
    popupRoots.current = {}

    // Add new markers
    locations.forEach((location) => {
      if (!isValidCoordinate(location.coordinates)) return
      const el = createMarkerElement(location)

      const marker = new window.mapboxgl.Marker(el).setLngLat(location.coordinates).addTo(map.current!)

      // Create popup
      const popupContainer = document.createElement("div")
      const root = createRoot(popupContainer)
      root.render(<MapMarkerPopup location={location} />)
      popupRoots.current[location.id] = root

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

    const validLocations = locations.filter((location) => isValidCoordinate(location.coordinates))
    if (validLocations.length === 0) return

    const bounds = new window.mapboxgl.LngLatBounds()
    validLocations.forEach((location) => {
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

      {/* Error and loading overlays are mutually exclusive — error takes priority */}
      {loadError ? (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-600">{loadError}</p>
            <p className="text-xs text-gray-500 mt-1">Try refreshing, or check back shortly</p>
            <button
              onClick={handleRetry}
              className="mt-3 bg-white hover:bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        (!mapLoaded || !mapboxLoaded) && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">{!mapboxLoaded ? "Loading Mapbox..." : "Loading map..."}</p>
            </div>
          </div>
        )
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
