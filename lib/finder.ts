// Artist finder (/find-artist): place lookup and the data calls behind it.
// Server only. The two finder_* database functions are in
// supabase/migrations/20261012170000_finder_near.sql.

import { createClient } from "@/utils/supabase/server"
import { cityPattern, rowToArtist } from "@/lib/supabase/artists"
import { getShopsNearMe } from "@/lib/supabase/shops"
import { geocodePlace } from "@/lib/mapbox"
import { parseLocation } from "@/lib/parse-location"
import { STATE_ABBR_TO_NAME } from "@/lib/utils/states"
import type { Artist } from "@/types/artist"
import type { Shop } from "@/types/shop"
import type { FinderSort } from "@/components/find-artist/finder-url"
import { withCardPhotos } from "@/lib/supabase/portfolio"

/** The radius choices on step 1, in miles. */
export const FINDER_RADII = [10, 25, 50, 100] as const
export const DEFAULT_RADIUS = 25
/** When nothing is in range, results retry at these radii (only the ones larger than the chosen one). */
export const WIDEN_RADII = [50, 100, 150] as const
export const MAX_STYLES = 3
export const PAGE_SIZE = 24

export interface FinderPlace {
  /** "Tampa, FL", "33618" or "Near Tampa, FL". */
  label: string
  lat: number
  lng: number
}

export type FinderArtist = Artist & { distanceMi: number }

/** A radius from the URL, or the default when it isn't one of the choices. */
export function toRadius(value: unknown): number {
  const r = Number(value)
  return (FINDER_RADII as readonly number[]).includes(r) ? r : DEFAULT_RADIUS
}

/** Valid map coordinates from the URL, or null. */
export function toCoords(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  if (lat == null || lng == null || lat === "" || lng === "") return null
  const la = Number(lat)
  const ln = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) return null
  return { lat: la, lng: ln }
}

function average(rows: { latitude: unknown; longitude: unknown }[]): { lat: number; lng: number } | null {
  const points = rows
    .map((r) => ({ lat: Number(r.latitude), lng: Number(r.longitude) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
  if (points.length === 0) return null
  return {
    lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
    lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
  }
}

/** The spelling most shops use ("Tampa", not "TAMPA"), falling back to title case. */
function properCity(rows: { city: unknown }[], typed: string): string {
  const tally = new Map<string, number>()
  for (const r of rows) {
    const c = String(r.city ?? "").trim()
    if (c) tally.set(c, (tally.get(c) ?? 0) + 1)
  }
  const best = Array.from(tally.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (best && best !== best.toUpperCase()) return best
  return typed.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase())
}

/**
 * Where a typed place is. Our own shops first, so it works on previews too:
 *   "33618"                         → average of active shops with that ZIP
 *   "Tampa, FL", "tampa fl",
 *   "TAMPA, FL", "Tampa, Florida"   → average of active shops in that city and state
 * then Mapbox. Null when neither knows the place.
 */
export async function lookupPlace(query: string): Promise<FinderPlace | null> {
  const text = query.replace(/\s+/g, " ").trim()
  if (!text) return null
  const supabase = createClient()

  if (/^\d{5}$/.test(text)) {
    const { data } = await supabase
      .from("shops")
      .select("latitude, longitude")
      .eq("is_active", true)
      .eq("zip", text)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
    const center = average(data ?? [])
    if (center) return { label: text, ...center }
  } else {
    const parsed = parseLocation(text)
    if (parsed?.city && parsed.state) {
      const { data } = await supabase
        .from("shops")
        .select("city, latitude, longitude")
        .eq("is_active", true)
        .eq("state", parsed.state)
        .ilike("city", cityPattern(parsed.city, true))
        .not("latitude", "is", null)
        .not("longitude", "is", null)
      const rows = data ?? []
      const center = average(rows)
      if (center) return { label: `${properCity(rows, parsed.city)}, ${parsed.state}`, ...center }
    }
  }

  const geo = await geocodePlace(text)
  if (!geo) return null
  const parsed = parseLocation(text)
  const label =
    /^\d{5}$/.test(text)
      ? text
      : parsed?.city && parsed.state
        ? `${properCity([], parsed.city)}, ${parsed.state}`
        : geo.name || text
  return { label, lat: geo.center[1], lng: geo.center[0] }
}

/** "Near Tampa, FL": the city of the nearest active shop, for "Use my location". */
export async function nearLabel(lat: number, lng: number): Promise<string> {
  for (const radius of [25, 100, 300]) {
    const { data } = await getShopsNearMe(lat, lng, radius)
    const shop = [...data].sort((a, b) => a.distance_mi - b.distance_mi).find((s) => s.location.city)
    if (shop) {
      const { city, state } = shop.location
      return `Near ${properCity([{ city }], city)}${state ? `, ${state}` : ""}`
    }
  }
  return "Near you"
}

/** Artists within the radius, nearest first (or most followed first), with the total that matched. */
export async function findArtists(opts: {
  lat: number
  lng: number
  radius: number
  styles: string[]
  limit: number
  offset?: number
  sort?: FinderSort
}): Promise<{ artists: FinderArtist[]; total: number; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("finder_artists_near", {
    p_lat: opts.lat,
    p_lng: opts.lng,
    p_radius_mi: opts.radius,
    p_styles: opts.styles.length > 0 ? opts.styles : null,
    p_limit: opts.limit,
    p_offset: opts.offset ?? 0,
    p_sort: opts.sort ?? "distance",
  })
  if (error) return { artists: [], total: 0, error: error.message }
  const rows = (data ?? []) as Record<string, unknown>[]
  const artists = rows.map((row) => ({ ...rowToArtist(row), distanceMi: Number(row.distance_mi ?? 0) }))
  return {
    // No avatar: the first portfolio photo is the card image.
    artists: await withCardPhotos(artists),
    total: Number(rows[0]?.total_count ?? 0),
    error: null,
  }
}

/**
 * The first `pages` pages of results in one list. The database function returns
 * at most 100 rows a call, so each page is its own call.
 */
export async function findArtistPages(opts: {
  lat: number
  lng: number
  radius: number
  styles: string[]
  pages: number
  sort?: FinderSort
}): Promise<{ artists: FinderArtist[]; total: number; error: string | null }> {
  const results = await Promise.all(
    Array.from({ length: opts.pages }, (_, i) => findArtists({ ...opts, limit: PAGE_SIZE, offset: i * PAGE_SIZE })),
  )
  const error = results.find((r) => r.error)?.error ?? null
  return { artists: results.flatMap((r) => r.artists), total: results[0]?.total ?? 0, error }
}

/** Artists per style near a point. "__all" is every artist in range, "__none" those with no styles. */
export async function styleCountsNear(lat: number, lng: number, radius: number): Promise<Record<string, number>> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("finder_style_counts_near", {
    p_lat: lat,
    p_lng: lng,
    p_radius_mi: radius,
  })
  if (error) throw new Error(error.message)
  return Object.fromEntries(((data ?? []) as { style: string; artists: number }[]).map((r) => [r.style, Number(r.artists)]))
}

/** The nearest active shops (search_shops_near), closest first. */
export async function nearestShops(
  lat: number,
  lng: number,
  radius: number,
  limit = 4,
): Promise<(Shop & { distance_mi: number })[]> {
  const { data } = await getShopsNearMe(lat, lng, radius)
  return [...data].sort((a, b) => a.distance_mi - b.distance_mi).slice(0, limit)
}

/** "/shops?city=Tampa&state=FL" or "/shops?zip=33618" for a finder label. */
export function shopsHref(label: string): string {
  const place = label.replace(/^Near\s+/i, "")
  const params = new URLSearchParams()
  if (/^\d{5}$/.test(place)) params.set("zip", place)
  else {
    const parsed = parseLocation(place)
    if (parsed?.city) params.set("city", parsed.city)
    if (parsed?.state) params.set("state", parsed.state)
  }
  const qs = params.toString()
  return qs ? `/shops?${qs}` : "/shops"
}

/** "Florida" for "FL"; unknown codes as given. */
export function stateName(state: string): string {
  return STATE_ABBR_TO_NAME[state.toUpperCase()] ?? state
}
