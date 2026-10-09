"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { type MapboxLocation, type MapStyle, defaultMapConfig, mapStyles } from "@/lib/mapbox"
import { MAP_COLORS } from "@/lib/brand-colors"

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

// Points cluster up to this zoom; from CLUSTER_MAX_ZOOM + 1 every pin is drawn
// on its own, which is when the list numbers its rows (map-interface.tsx).
export const CLUSTER_MAX_ZOOM = 13
export const UNCLUSTERED_ZOOM = CLUSTER_MAX_ZOOM + 1

// Pins that would overlap (a shop and its artists share coordinates) are
// spread on a small circle once nothing clusters, so each one shows and can
// be clicked.
// Neighbours sit this many px apart (pin diameter plus a little); the spread
// is redone each half zoom level, so the gap stays between 1x and 1.4x this.
const SPREAD_GAP_PX = 20
const SPREAD_GAP_NUMBERED_PX = 32

// The map's own buttons cover its top edge (list toggle, "Zoom out to the US",
// Map/Satellite: 16px + 2 × 44px + 8px gap) and its right edge (zoom and
// locate buttons: 16px + 44px). The list only counts pins outside those
// strips, so every numbered pin can be seen and tapped.
const CONTROLS_TOP_PX = 116
const CONTROLS_RIGHT_PX = 64

/** The map's visible area minus the strips its controls cover, plus the zoom. */
export function getViewBounds(m: any): MapBounds {
  const canvas = m.getCanvas()
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  const nw = m.unproject([0, Math.min(CONTROLS_TOP_PX, height / 2)])
  const se = m.unproject([width - Math.min(CONTROLS_RIGHT_PX, width / 2), height])
  return { west: nw.lng, north: nw.lat, east: se.lng, south: se.lat, zoom: m.getZoom() }
}

/** Half-zoom bucket the spread is computed for, or -1 while points still cluster. */
const spreadKey = (zoom: number) => (zoom >= UNCLUSTERED_ZOOM ? Math.floor(zoom * 2) / 2 : -1)

const SELECTED = ["boolean", ["feature-state", "selected"], false]
const NUMBERED = ["has", "num"]

// Cluster counts and pin numbers use Libre Franklin SemiBold when the base
// style ships it (the custom flash-chart style), else a font every Mapbox
// style can serve. A font stack naming a font the style lacks fails to load.
// The selected pin is redrawn above the rest (artists often share their
// shop's coordinates, so pins stack). Clustered points never match.
const selectedFilter = (id: string | null) => ["==", ["get", "lid"], id ?? ""]

function labelFont(m: any): string[] {
  const layers: any[] = m.getStyle()?.layers ?? []
  const hasFranklin = layers.some((l) => {
    const font = l.layout?.["text-font"]
    return Array.isArray(font) && font.includes("Libre Franklin SemiBold")
  })
  return [hasFranklin ? "Libre Franklin SemiBold" : "Open Sans Semibold", "Arial Unicode MS Bold"]
}

interface LocationFeature {
  type: "Feature"
  id: string
  geometry: { type: "Point"; coordinates: [number, number] }
  // num: 1–9 for the first rows of the sidebar list, shown on the pin.
  // lid duplicates id: Mapbox drops non-integer feature ids, so the source
  // promotes lid instead (feature-state and click lookups need it).
  properties: { lid: string; locType: "shop" | "artist"; num?: number }
}

// Web Mercator world pixels at `zoom` (512px tiles, as Mapbox GL draws them).
function toWorldPx([lng, lat]: [number, number], zoom: number): [number, number] {
  const size = 512 * 2 ** zoom
  const sin = Math.sin((lat * Math.PI) / 180)
  return [((lng + 180) / 360) * size, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size]
}

function fromWorldPx([x, y]: [number, number], zoom: number): [number, number] {
  const size = 512 * 2 ** zoom
  const n = Math.PI - (2 * Math.PI * y) / size
  return [(x / size) * 360 - 180, (180 / Math.PI) * Math.atan(Math.sinh(n))]
}

// Spreads pins that would overlap at `zoom` (a spreadKey value; -1 leaves
// them as they are) around a small circle: pins within GROUP_PX of a group's
// first pin join it. Mostly a shop and its artists at one point, sometimes
// a duplicate listing a few metres away.
const GROUP_PX = 24

function spreadFeatures(features: LocationFeature[], zoom: number): LocationFeature[] {
  if (zoom < 0) return features
  // Groups indexed by grid cell (GROUP_PX square) of their first pin.
  const cells = new Map<string, { anchor: [number, number]; members: [LocationFeature, [number, number]][] }[]>()
  const groups: { anchor: [number, number]; members: [LocationFeature, [number, number]][] }[] = []
  const ordered = [...features].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  for (const f of ordered) {
    const px = toWorldPx(f.geometry.coordinates, zoom)
    const cx = Math.floor(px[0] / GROUP_PX)
    const cy = Math.floor(px[1] / GROUP_PX)
    let group = null
    for (let dx = -1; dx <= 1 && !group; dx++) {
      for (let dy = -1; dy <= 1 && !group; dy++) {
        group =
          cells.get(`${cx + dx},${cy + dy}`)?.find(
            (g) => Math.hypot(g.anchor[0] - px[0], g.anchor[1] - px[1]) < GROUP_PX
          ) ?? null
      }
    }
    if (group) {
      group.members.push([f, px])
      continue
    }
    const created = { anchor: px, members: [[f, px]] as [LocationFeature, [number, number]][] }
    groups.push(created)
    const key = `${cx},${cy}`
    cells.set(key, [...(cells.get(key) ?? []), created])
  }

  const out: LocationFeature[] = []
  for (const { members } of groups) {
    if (members.length === 1) {
      out.push(members[0][0])
      continue
    }
    const centre = [0, 1].map((i) => members.reduce((sum, [, px]) => sum + px[i], 0) / members.length)
    const gap = members.some(([f]) => f.properties.num) ? SPREAD_GAP_NUMBERED_PX : SPREAD_GAP_PX
    // Radius whose chord between neighbours is `gap`.
    const radius = gap / (2 * Math.sin(Math.PI / members.length))
    members.forEach(([f], i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / members.length
      const coordinates = fromWorldPx([centre[0] + radius * Math.cos(angle), centre[1] + radius * Math.sin(angle)], zoom)
      out.push({ ...f, geometry: { type: "Point", coordinates } })
    })
  }
  return out
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
  zoom: number
}

interface MapboxMapProps {
  accessToken: string
  locations: MapboxLocation[]
  selectedLocation: MapboxLocation | null
  onLocationSelect: (location: MapboxLocation | null) => void
  center?: [number, number]
  zoom?: number
  style?: MapStyle
  /** Location id → list number (1–9) to draw on that pin. */
  pinNumbers?: Map<string, number>
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
  style = "chart",
  pinNumbers,
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
  // Features before spreading, and the spreadKey the source data was built for.
  const baseFeaturesRef = useRef<LocationFeature[]>([])
  const spreadKeyRef = useRef(-1)
  const locationsByIdRef = useRef<Map<string, MapboxLocation>>(new Map())
  const previousSelectedIdRef = useRef<string | null>(null)
  const clusterHandlersAttachedRef = useRef(false)

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
        promoteId: "lid",
        cluster: true,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        clusterRadius: 50,
      })

      const font = labelFont(m)

      // Clusters are flash-yellow seals with a double ink ring: the outer
      // circle carries the 2.5px stroke, "clusters-ring" the inner 1.2px one.
      m.addLayer({
        id: "clusters",
        type: "circle",
        source: LOCATIONS_SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": MAP_COLORS.flashYellow,
          "circle-radius": ["step", ["get", "point_count"], 20, 25, 24, 100, 28],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": MAP_COLORS.ink,
        },
      })

      m.addLayer({
        id: "clusters-ring",
        type: "circle",
        source: LOCATIONS_SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-opacity": 0,
          "circle-radius": ["step", ["get", "point_count"], 16, 25, 20, 100, 24],
          "circle-stroke-width": 1.2,
          "circle-stroke-color": MAP_COLORS.ink,
        },
      })

      // Counts are smaller than pin numbers (13px), inside the ring. Numbers
      // only show once nothing clusters, so the two never appear together.
      m.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: LOCATIONS_SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": font,
          "text-size": 11,
          "text-allow-overlap": true,
        },
        paint: { "text-color": MAP_COLORS.ink },
      })

      // Pins: small vellum dots; numbered pins (the list's first 9) are
      // larger so the number fits. Selected: flash red.
      m.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: LOCATIONS_SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "circle-sort-key": ["case", NUMBERED, ["-", 10, ["get", "num"]], 0],
        },
        paint: {
          "circle-color": ["case", SELECTED, MAP_COLORS.flashRed, MAP_COLORS.vellum],
          "circle-radius": ["case", NUMBERED, ["case", SELECTED, 15, 13], ["case", SELECTED, 10, 7]],
          "circle-stroke-width": ["case", SELECTED, 2.5, 2],
          "circle-stroke-color": MAP_COLORS.ink,
        },
      })

      m.addLayer({
        id: "pin-number",
        type: "symbol",
        source: LOCATIONS_SOURCE_ID,
        filter: ["all", ["!", ["has", "point_count"]], NUMBERED],
        layout: {
          "text-field": ["to-string", ["get", "num"]],
          "text-font": font,
          "text-size": 13,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: { "text-color": ["case", SELECTED, MAP_COLORS.white, MAP_COLORS.ink] },
      })

      const selectedId = previousSelectedIdRef.current
      m.addLayer({
        id: "selected-point",
        type: "circle",
        source: LOCATIONS_SOURCE_ID,
        filter: selectedFilter(selectedId),
        paint: {
          "circle-color": MAP_COLORS.flashRed,
          "circle-radius": ["case", NUMBERED, 15, 10],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": MAP_COLORS.ink,
        },
      })

      m.addLayer({
        id: "selected-number",
        type: "symbol",
        source: LOCATIONS_SOURCE_ID,
        filter: ["all", selectedFilter(selectedId), NUMBERED],
        layout: {
          "text-field": ["to-string", ["get", "num"]],
          "text-font": font,
          "text-size": 13,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: { "text-color": MAP_COLORS.white },
      })

      // Invisible, larger-radius layer purely for hit-testing. The visible
      // dot above is deliberately small/readable; without this, its actual
      // tap target is well under the ~44px minimum touch target, so on a
      // real finger tap (less precise than a mouse, prone to a few px of
      // jitter) the tap misses the geometry or reads as a micro-drag and
      // the click handler never fires. Click/hover handlers are attached to
      // this layer, not the visible one.
      m.addLayer({
        id: "unclustered-point-hitbox",
        type: "circle",
        source: LOCATIONS_SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 22,
          "circle-opacity": 0,
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

      m.on("click", "unclustered-point-hitbox", (e: any) => {
        // Spread pins' hitboxes overlap: take the pin nearest the click.
        let feature: any = null
        let best = Infinity
        for (const f of e.features ?? []) {
          const p = m.project(f.geometry.coordinates)
          const d = (p.x - e.point.x) ** 2 + (p.y - e.point.y) ** 2
          if (d < best) {
            best = d
            feature = f
          }
        }
        if (!feature) return
        const location = locationsByIdRef.current.get(String(feature.id))
        if (!location) return

        // Centering/zooming happens via the center/zoom-prop-driven flyTo
        // effect below, triggered by onLocationSelect updating parent state
        // — calling flyTo here too would race that effect's own animation.
        onLocationSelectRef.current(location)
      })

      m.on("mouseenter", "clusters", () => { m.getCanvas().style.cursor = "pointer" })
      m.on("mouseleave", "clusters", () => { m.getCanvas().style.cursor = "" })
      m.on("mouseenter", "unclustered-point-hitbox", () => { m.getCanvas().style.cursor = "pointer" })
      m.on("mouseleave", "unclustered-point-hitbox", () => { m.getCanvas().style.cursor = "" })
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

    // Zoom buttons (no compass) and the scale bar; restyled in globals.css
    // under .tm-map. The default attribution control stays as is.
    map.current.addControl(new window.mapboxgl.NavigationControl({ showCompass: false }), "top-right")
    map.current.addControl(new window.mapboxgl.ScaleControl({ unit: "imperial" }), "bottom-right")

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
      onMoveEndRef.current?.(getViewBounds(map.current))
    })

    // Re-spread overlapping pins for the new zoom (see spreadFeatures).
    map.current.on("zoomend", () => {
      if (spreadKey(map.current.getZoom()) !== spreadKeyRef.current) applyDataRef.current()
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

  // Update map style. Guarded against firing on the *first* mapLoaded change
  // (this effect depends on mapLoaded so it can wait until the map exists,
  // not so it re-applies the style the map was already constructed with) —
  // setStyle() unconditionally wipes every custom source/layer, and an
  // unnecessary call right as the map finishes loading can race the
  // clustered source being (re-)populated with real data, leaving it
  // recreated-but-empty with nothing left to repopulate it.
  const appliedStyleRef = useRef(style)
  useEffect(() => {
    if (!map.current || !mapLoaded || !window.mapboxgl) return
    if (style === appliedStyleRef.current) return
    appliedStyleRef.current = style
    map.current.setStyle(mapStyles[style])
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

  // Spreads the current features for the map's zoom and pushes them to the
  // source. setData can drop feature-state, so the selected pin is re-marked.
  const applyData = useCallback(() => {
    const m = map.current
    const key = m ? spreadKey(m.getZoom()) : -1
    spreadKeyRef.current = key
    geojsonRef.current = { type: "FeatureCollection", features: spreadFeatures(baseFeaturesRef.current, key) }
    const source = m && mapLoaded ? m.getSource(LOCATIONS_SOURCE_ID) : null
    if (!source) return
    source.setData(geojsonRef.current)
    const selectedId = previousSelectedIdRef.current
    if (selectedId && locationsByIdRef.current.has(selectedId)) {
      m.setFeatureState({ source: LOCATIONS_SOURCE_ID, id: selectedId }, { selected: true })
    }
  }, [mapLoaded])
  const applyDataRef = useRef(applyData)
  useEffect(() => {
    applyDataRef.current = applyData
  }, [applyData])

  // Sync locations -> GeoJSON source. Cheap even at thousands of points,
  // since it's one setData() call rather than tearing down/rebuilding a DOM
  // marker per location. Pin numbers are a feature property (symbol layout
  // can't read feature-state), so a new list order also re-sets the data.
  useEffect(() => {
    const byId = new Map<string, MapboxLocation>()
    const features: LocationFeature[] = []
    for (const location of locations) {
      if (!isValidCoordinate(location.coordinates)) continue
      byId.set(location.id, location)
      // Only numbered pins get "num" — the layers test it with ["has", "num"].
      const num = pinNumbers?.get(location.id)
      features.push({
        type: "Feature",
        id: location.id,
        geometry: { type: "Point", coordinates: location.coordinates },
        properties: num
          ? { lid: location.id, locType: location.type, num }
          : { lid: location.id, locType: location.type },
      })
    }
    locationsByIdRef.current = byId
    baseFeaturesRef.current = features
    applyData()
  }, [locations, pinNumbers, mapLoaded, applyData])

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

    const id = selectedLocation?.id ?? null
    if (m.getLayer("selected-point")) {
      m.setFilter("selected-point", selectedFilter(id))
      m.setFilter("selected-number", ["all", selectedFilter(id), NUMBERED])
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

  // Flies back to the default continental-US view. Search and filters stay.
  const zoomOutToUS = useCallback(() => {
    if (!map.current) return
    map.current.flyTo({
      center: defaultMapConfig.center,
      zoom: defaultMapConfig.zoom,
      duration: 1000,
    })
  }, [])

  return (
    <div className={`tm-map relative w-full h-full ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />

      {/* Error and loading overlays are mutually exclusive — error takes priority */}
      {loadError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-paper px-4">
          <div className="max-w-sm rounded-lg border-1.5 border-ink bg-vellum p-5 text-center">
            <p className="font-semibold text-ink">{loadError}</p>
            <p className="mt-1 text-sm text-ink-muted">Try refreshing, or check back shortly</p>
            <button
              onClick={handleRetry}
              className="mt-4 min-h-11 rounded-lg border-1.5 border-ink bg-vellum px-4 text-[15px] font-semibold text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        (!mapLoaded || !mapboxLoaded) && (
          <div className="absolute inset-0 flex items-center justify-center bg-paper">
            <div className="text-center">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-rule border-t-ink"></div>
              <p className="text-sm text-ink-muted">{!mapboxLoaded ? "Loading Mapbox..." : "Loading map..."}</p>
            </div>
          </div>
        )
      )}

      {/* Sits below the list toggle that map-interface.tsx puts at top-4 left-4. */}
      <div className="absolute left-4 top-[68px] z-10">
        <button
          onClick={zoomOutToUS}
          className="min-h-11 rounded-lg border-1.5 border-ink bg-vellum px-3 text-[15px] font-semibold text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          disabled={!mapLoaded || !mapboxLoaded}
        >
          Zoom out to the US
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
