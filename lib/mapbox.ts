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
}

export interface MapboxConfig {
  accessToken: string
  style: string
  center: [number, number]
  zoom: number
}

export const mapboxConfig: MapboxConfig = {
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "",
  style: "mapbox://styles/mapbox/streets-v12",
  center: [-122.4194, 37.7749], // San Francisco
  zoom: 12,
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

export function geocodeAddress(address: string): Promise<[number, number] | null> {
  // Mock geocoding - in real implementation, this would call Mapbox Geocoding API
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock coordinates for common cities
      const mockCoordinates: Record<string, [number, number]> = {
        "san francisco": [-122.4194, 37.7749],
        "los angeles": [-118.2437, 34.0522],
        "new york": [-74.006, 40.7128],
        chicago: [-87.6298, 41.8781],
        miami: [-80.1918, 25.7617],
        seattle: [-122.3321, 47.6062],
        austin: [-97.7431, 30.2672],
        denver: [-104.9903, 39.7392],
      }

      const normalizedAddress = address.toLowerCase()
      for (const [city, coords] of Object.entries(mockCoordinates)) {
        if (normalizedAddress.includes(city)) {
          resolve(coords)
          return
        }
      }

      // Default to San Francisco if no match
      resolve([-122.4194, 37.7749])
    }, 300)
  })
}

export function reverseGeocode(coordinates: [number, number]): Promise<string> {
  // Mock reverse geocoding
  return new Promise((resolve) => {
    setTimeout(() => {
      const [lng, lat] = coordinates

      // Simple mock based on coordinates
      if (Math.abs(lng + 122.4194) < 0.1 && Math.abs(lat - 37.7749) < 0.1) {
        resolve("San Francisco, CA")
      } else if (Math.abs(lng + 118.2437) < 0.1 && Math.abs(lat - 34.0522) < 0.1) {
        resolve("Los Angeles, CA")
      } else if (Math.abs(lng + 74.006) < 0.1 && Math.abs(lat - 40.7128) < 0.1) {
        resolve("New York, NY")
      } else {
        resolve("Unknown Location")
      }
    }, 300)
  })
}

export function getCurrentLocation(): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve([position.coords.longitude, position.coords.latitude])
      },
      (error) => {
        // Fallback to San Francisco
        console.warn("Geolocation error:", error)
        resolve([-122.4194, 37.7749])
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      },
    )
  })
}
