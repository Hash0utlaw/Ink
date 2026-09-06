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
  specialties: string[]
  priceRange: "low" | "medium" | "high"
  distance?: number // in miles
  // Optional enrichment fields
  description?: string
  website?: string
  hours?: Record<string, string>
  phone?: string
  instagram?: string
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

export const mapStyles = {
  streets: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-v9",
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
} as const
