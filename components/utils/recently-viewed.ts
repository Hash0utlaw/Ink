const STORAGE_KEY = "tm_recently_viewed"
const MAX_ITEMS = 6

export interface RecentlyViewedArtist {
  id: string
  name: string
  handle: string
  avatarUrl: string
  city: string
}

export function getRecentlyViewed(): RecentlyViewedArtist[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RecentlyViewedArtist[]) : []
  } catch {
    return []
  }
}

export function recordArtistVisit(artist: RecentlyViewedArtist): void {
  if (typeof window === "undefined") return
  try {
    const existing = getRecentlyViewed().filter((item) => item.id !== artist.id)
    const next = [artist, ...existing].slice(0, MAX_ITEMS)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore storage failures (private browsing, quota, etc.)
  }
}
