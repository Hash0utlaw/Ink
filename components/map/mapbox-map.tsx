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

const LOCATIONS_SOURCE_ID = "locations"

interface LocationFeature {
  type: "Feature"
  id: string
  geometry: { type: "Point"; coordinates: [number, number] }
  properties: { color: string; locType: "shop" | "artist" }
}
interface LocationFeatureCollection {
  type: "FeatureCollection"
  features: LocationFeature[]
}

export interface MapBounds {
  west: number
  south: number
  east: number
  north: number
}

interface MapboxMapProps {
  accessToken: string
  locations: MapboxLocation[]
  selectedLocation: MapboxLocation | null
  onLocationSelect: (location: MapboxLocation | null) => void
  center?: [number, number]
  zoom?: number
  style?: keyof typeof mapStyles
  onMapLoad?: (map: any) => void
  onMoveEnd?: (bounds: MapBounds) => void
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
  onMoveEnd,
  className = "",
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const onMapLoadRef = useRef(onMapLoad)
  const onMoveEndRef = useRef(onMoveEnd)
  const onLocationSelectRef = useRef(onLocationSelect)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapboxLoaded, setMapboxLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Bumped on every manual Retry so the watchdog effect below gets a fresh
  // 15s window instead of relying on a timer left over from a prior attempt.
  const [loadAttempt, setLoadAttempt] = useState(0)

  // Data + selection plumbing for the clustered source (see "Sync locations"
  // effect below). Kept in refs, not state, because they're read from inside
  // Mapbox event callbacks that must never close over stale props.
  const geojsonRef = useRef<LocationFeatureCollection>({ type: "FeatureCollection", features: [] })
  const locationsByIdRef = useRef<Map<string, MapboxLocation>>(new Map())
  const previousSelectedIdRef = useRef<string | null>(null)
  const clusterHandlersAttachedRef = useRef(false)
  const popupRef = useRef<any>(null)
  const popupRootRef = useRef<ReturnType<typeof createRoot> | null>(null)
  const popupContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    onMapLoadRef.current = onMapLoad
  }, [onMapLoad])
  useEffect(() => {
    onMoveEndRef.current = onMoveEnd
  }, [onMoveEnd])
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect
  }, [onLocationSelect])

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

  // Colors a location by its primary specialty — used as a GeoJSON feature
  // property so the "unclustered-point" layer's paint expression can read it,
  // instead of setting inline DOM styles per marker.
  const getStyleColor = useCallback((specialties: string[]): string => {
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
  }, [])

  // Ensures the clustered source + layers exist, (re-)attaches to it after a
  // style swap (setStyle removes every custom source/layer, since it's not
  // part of the new style's own JSON), and repopulates it with the latest
  // data. Click/hover handlers are layer-id-scoped and survive style swaps on
  // their own, so they're attached exactly once, guarded by a ref.
  const ensureClusterLayers = useCallback(() => {
    const m = map.current
    if (!m) return

    if (!m.getSource(LOCATIONS_SOURCE_ID)) {
      m.addSource(LOCATIONS_SOURCE_ID, {
        type: "geojson",
        data: geojsonRef.current,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      })

      m.addLayer({
        id: "clusters",
        type: "circle",
        source: LOCATIONS_SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "#8B1538", 25, "#6b1029", 100, "#4a0b1d"],
          "circle-radius": ["step", ["get", "point_count"], 16, 25, 22, 100, 28],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      })

      m.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: LOCATIONS_SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: { "text-color": "#ffffff" },
      })

      m.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: LOCATIONS_SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 12,
            ["==", ["get", "locType"], "shop"], 8,
            6,
          ],
          "circle-stroke-width": ["case", ["boolean", ["feature-state", "selected"], false], 3, 1.5],
          "circle-stroke-color": "#ffffff",
        },
      })
    } else {
      m.getSource(LOCATIONS_SOURCE_ID).setData(geojsonRef.current)
    }

    if (!clusterHandlersAttachedRef.current) {
      clusterHandlersAttachedRef.current = true

      m.on("click", "clusters", (e: any) => {
        const feature = e.features?.[0]
        if (!feature) return
        const clusterId = feature.properties?.cluster_id
        const source = m.getSource(LOCATIONS_SOURCE_ID)
        source.getClusterExpansionZoom(clusterId, (err: any, expansionZoom: number) => {
          if (err) return
          m.easeTo({ center: feature.geometry.coordinates, zoom: expansionZoom })
        })
      })

      m.on("click", "unclustered-point", (e: any) => {
        const feature = e.features?.[0]
        if (!feature) return
        const location = locationsByIdRef.current.get(String(feature.id))
        if (!location) return

        onLocationSelectRef.current(location)
        m.flyTo({
          center: location.coordinates,
          zoom: Math.max(m.getZoom(), 14),
          duration: 1000,
        })

        if (!popupContainerRef.current) {
          popupContainerRef.current = document.createElement("div")
          popupRootRef.current = createRoot(popupContainerRef.current)
        }
        popupRootRef.current!.render(<MapMarkerPopup location={location} />)

        if (!popupRef.current) {
          popupRef.current = new window.mapboxgl.Popup({ offset: 15, closeButton: true, closeOnClick: false })
        }
        popupRef.current.setLngLat(location.coordinates).setDOMContent(popupContainerRef.current).addTo(m)
      })

      m.on("mouseenter", "clusters", () => { m.getCanvas().style.cursor = "pointer" })
      m.on("mouseleave", "clusters", () => { m.getCanvas().style.cursor = "" })
      m.on("mouseenter", "unclustered-point", () => { m.getCanvas().style.cursor = "pointer" })
      m.on("mouseleave", "unclustered-point", () => { m.getCanvas().style.cursor = "" })
    }
  }, [])

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

    // Fires after the initial style loads AND after every subsequent
    // setStyle() call (see the "Update map style" effect below) — setStyle
    // wipes any source/layer that isn't part of the new style's own JSON, so
    // this is where the clustered source gets (re-)established either way.
    map.current.on("style.load", ensureClusterLayers)

    map.current.on("moveend", () => {
      const b = map.current.getBounds()
      onMoveEndRef.current?.({ west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() })
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
    clusterHandlersAttachedRef.current = false
    setLoadError(null)
    setMapLoaded(false)
    setMapboxLoaded(false)
    setLoadAttempt((n) => n + 1)
    loadMapbox()
  }, [loadMapbox])

  // Unmount the shared popup's React root when the map itself unmounts
  useEffect(() => {
    return () => {
      popupRootRef.current?.unmount()
      popupRootRef.current = null
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

  // Sync locations -> GeoJSON source. Cheap even at thousands of points,
  // since it's one setData() call rather than tearing down/rebuilding a DOM
  // marker per location.
  useEffect(() => {
    const byId = new Map<string, MapboxLocation>()
    const features: LocationFeature[] = []
    for (const location of locations) {
      if (!isValidCoordinate(location.coordinates)) continue
      byId.set(location.id, location)
      features.push({
        type: "Feature",
        id: location.id,
        geometry: { type: "Point", coordinates: location.coordinates },
        properties: { color: getStyleColor(location.specialties), locType: location.type },
      })
    }
    locationsByIdRef.current = byId
    geojsonRef.current = { type: "FeatureCollection", features }

    if (map.current && mapLoaded) {
      map.current.getSource(LOCATIONS_SOURCE_ID)?.setData(geojsonRef.current)
    }
  }, [locations, mapLoaded, getStyleColor])

  // Highlight the selected point via Mapbox feature-state instead of
  // mutating a per-marker DOM element (there are no more per-marker elements).
  useEffect(() => {
    const m = map.current
    if (!m || !mapLoaded) return

    const prevId = previousSelectedIdRef.current
    if (prevId && prevId !== selectedLocation?.id) {
      try {
        m.setFeatureState({ source: LOCATIONS_SOURCE_ID, id: prevId }, { selected: false })
      } catch {
        // feature may no longer be in the currently-loaded viewport slice
      }
    }

    if (selectedLocation) {
      try {
        m.setFeatureState({ source: LOCATIONS_SOURCE_ID, id: selectedLocation.id }, { selected: true })
        previousSelectedIdRef.current = selectedLocation.id
      } catch {
        previousSelectedIdRef.current = null
      }
    } else {
      previousSelectedIdRef.current = null
    }
  }, [selectedLocation, mapLoaded])

  // "Show All" now zooms out to the fixed continental-US default view rather
  // than fitting to `locations`, since locations only ever holds whatever's
  // already in the current viewport-scoped fetch (see map-interface.tsx).
  const fitBounds = useCallback(() => {
    if (!map.current) return
    map.current.flyTo({
      center: defaultMapConfig.center,
      zoom: defaultMapConfig.zoom,
      duration: 1000,
    })
  }, [])

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
