export interface MapboxLocation {
  id: string
  name: string
  type: "artist" | "shop"
  coordinates: [number, number] // [longitude, latitude]
  address: string
  rating: number
  reviewCount: number
  image?: string
  isOpen: boolean
  /** Canonical style slugs (lib/styles.ts): artists.styles, or shop_styles for shops. */
  styles: string[]
  priceRange: "low" | "medium" | "high"
  distance?: number // in miles
  /** Artists only: the shop they work at, when known. */
  shopName?: string
  // Optional enrichment fields
  description?: string
  website?: string
  hours?: Record<string, string>
  phone?: string
  instagram?: string
}

/**
 * Artists with no shop, grouped at one city-center point (2 decimals, never an
 * address). Drawn as one navy circle with a count that never spreads into pins.
 */
export interface MapArea {
  /** "25.77,-80.28": the point, also the lookup key for /api/map/area. */
  key: string
  lat: number
  lng: number
  count: number
  city: string
  state: string
}

/** One artist in a city circle's list. */
export interface MapAreaArtist {
  id: string
  name: string
  followers: number | null
  privateStudio: boolean
}

/** "Shop", "Artist at Ink Co." or "Artist": the muted line under a map list name. */
export function locationKindLabel(location: Pick<MapboxLocation, "type" | "shopName">): string {
  if (location.type === "shop") return "Shop"
  return location.shopName ? `Artist at ${location.shopName}` : "Artist"
}

export interface MapboxConfig {
  accessToken: string
  style: string
  center: [number, number]
  zoom: number
}

export const mapboxConfig: MapboxConfig = {
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "",
  style: "mapbox://styles/mapbox/streets-v12",
  center: [-98.5795, 39.8283], // Continental US center
  zoom: 4,
}

// Utility functions for map operations
export function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const [lng1, lat1] = coord1
  const [lng2, lat2] = coord2

  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * A US city, ZIP or state for the map search: its centre, name ("Charlotte")
 * and Mapbox type ("place", "postcode", "region", ...). Null when Mapbox has no such place.
 */
export async function geocodePlace(
  query: string,
): Promise<{ center: [number, number]; name: string; type: string } | null> {
  try {
    const params = new URLSearchParams({
      access_token: mapboxConfig.accessToken,
      country: "us",
      types: "postcode,place,locality,district,region",
      limit: "1",
    })
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`,
    )
    if (!response.ok) throw new Error("Geocoding request failed")
    const feature = (await response.json()).features?.[0]
    if (!feature) return null
    return { center: feature.center, name: String(feature.text ?? ""), type: String(feature.place_type?.[0] ?? "") }
  } catch (error) {
    console.warn("Geocoding error:", error)
    return null
  }
}

export async function geocodeAddress(address: string): Promise<[number, number] | null> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxConfig.accessToken}&limit=1`,
    )

    if (!response.ok) {
      throw new Error("Geocoding request failed")
    }

    const data = await response.json()

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center
      return [lng, lat]
    }

    return null
  } catch (error) {
    console.warn("Geocoding error:", error)
    return null
  }
}

export async function reverseGeocode(coordinates: [number, number]): Promise<string | null> {
  try {
    const [lng, lat] = coordinates
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxConfig.accessToken}&limit=1`,
    )

    if (!response.ok) {
      throw new Error("Reverse geocoding request failed")
    }

    const data = await response.json()

    if (data.features && data.features.length > 0) {
      return data.features[0].place_name
    }

    return null
  } catch (error) {
    console.warn("Reverse geocoding error:", error)
    return null
  }
}

export function getCurrentLocation(): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve([position.coords.longitude, position.coords.latitude])
      },
      (error) => {
        console.warn("Geolocation error:", error)
        resolve(null)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      },
    )
  })
}

export const defaultMapConfig = {
  center: [-98.5795, 39.8283] as [number, number], // Continental US center
  zoom: 4,
}

// "chart" is the flash-chart style (a custom Mapbox Studio style set via
// NEXT_PUBLIC_MAPBOX_STYLE_URL); light-v11 stands in until it's configured.
export const mapStyles = {
  chart: process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL || "mapbox://styles/mapbox/light-v11",
  satellite: "mapbox://styles/mapbox/satellite-v9",
} as const

export type MapStyle = keyof typeof mapStyles

/**
 * A Mapbox Static Images URL for the chart style, centred on [lng, lat], with
 * no marker (pages draw their own X on top). "mapbox://styles/{user}/{id}"
 * becomes "styles/v1/{user}/{id}". Mapbox's logo and attribution stay on.
 */
export function staticMapUrl(
  [lng, lat]: [number, number],
  { zoom = 14, width = 800, height = 320 }: { zoom?: number; width?: number; height?: number } = {},
): string {
  const style = mapStyles.chart.replace(/^mapbox:\/\/styles\//, "")
  const params = new URLSearchParams({ access_token: mapboxConfig.accessToken })
  return `https://api.mapbox.com/styles/v1/${style}/static/${lng},${lat},${zoom},0/${width}x${height}@2x?${params}`
}
