// The location from the homepage's "Use my location", kept for this browser
// session so the artists section can show "Artists near {city}".
export const HOME_NEAR_KEY = "tm_home_near"

export function readHomeLocation(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(HOME_NEAR_KEY)
    if (!raw) return null
    const { lat, lng } = JSON.parse(raw) as { lat: unknown; lng: unknown }
    return typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null
  } catch {
    return null
  }
}

export function clearHomeLocation(): void {
  try {
    window.sessionStorage.removeItem(HOME_NEAR_KEY)
  } catch {
    // storage blocked: nothing to clear
  }
}
