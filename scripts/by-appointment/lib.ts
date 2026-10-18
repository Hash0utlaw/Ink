// scripts/by-appointment/lib.ts
// Step 6: TattoosWizard artists who work privately (by appointment, no public
// shop). Reads only what Step 1 cached; fetches nothing.
//
// Who counts as private: scripts/tw/match.ts status "artist_new_private" in
// data/reports/tattooswizard-profiles.csv — a TattoosWizard artist page (not a
// studio page) that matched none of our artists (Instagram handle, or name +
// city + state), whose own Instagram, phone and website matched none of our
// shops, and that names no studio on its page or in its bio.
//
// Privacy: the raw page's location can be a street address or an exact point
// (it isn't always the city's center). None of that is used. The only place we
// keep is city + state, and the map point is the city center computed from our
// own active shops in that city (the same average /find-artist uses for a typed
// "City, ST"), rounded to 2 decimals (about 1 km).
//
// Email and phone are counted, never copied into reports or the database.

import fs from "fs"
import path from "path"
import zlib from "zlib"
import { matchStyleSlugs, type StyleSlug } from "../../lib/styles"
import { parseCSV } from "../lib/cleanup-utils"
import { PROFILES_FILE, REPORT_DIR, readJsonl } from "../tw/lib/common"
import type { Profile } from "../tw/lib/parse"
import { normCity, placeKey } from "../tw/lib/normalize"
import { socialProfile } from "../socials/lib/social"

export { REPORT_DIR }
export const MATCH_FILE = path.join(REPORT_DIR, "tattooswizard-profiles.csv")
export const RAW_DIR = path.resolve("data/cache/tattooswizard/tattooswizard.com/artists")

// Same style rule as scripts/tw/import.ts (step 4 of Step 1).
const MAX_STYLES = 4
const TAG_MIN_PIECES = 3
const TAG_MIN_SHARE = 0.15

export function styleRule(p: Profile): StyleSlug[] {
  const out: StyleSlug[] = []
  const add = (raw: string | null) => {
    for (const s of raw ? matchStyleSlugs(raw) : []) if (!out.includes(s)) out.push(s)
  }
  add(p.main_style)
  const total = p.style_tags.reduce((n, t) => n + (t.count ?? 0), 0)
  const strong = p.style_tags
    .filter((t) => t.count !== null && t.count >= TAG_MIN_PIECES && total > 0 && t.count / total >= TAG_MIN_SHARE)
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
  for (const t of strong) add(t.style)
  return out.slice(0, MAX_STYLES)
}

/** What the raw page adds beyond profiles.jsonl. Personal contact details stay as booleans. */
export interface RawExtras {
  has_email: boolean
  has_phone: boolean
  has_photo: boolean
  /** location.address / location.name present: a street or a named place. */
  has_street: boolean
  /** A 5-digit ZIP inside location.address. */
  has_zip: boolean
  has_coords: boolean
  /** Rounded "lat,lng" from the page, only to tell city-wide points from exact ones. */
  coord_key: string | null
  /** Exact page point, only to keep pins away from it; never stored or printed. */
  lat: number | null
  lng: number | null
  tiktok: string | null
}

export interface Candidate {
  p: Profile
  raw: RawExtras
}

function readRaw(username: string): RawExtras | null {
  const file = path.join(RAW_DIR, `${username}.gz`)
  if (!fs.existsSync(file)) return null
  const html = zlib.gunzipSync(fs.readFileSync(file)).toString("utf-8")
  const m = html.match(/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) return null
  let body: Record<string, unknown> | null = null
  try {
    for (const e of Object.values(JSON.parse(m[1]) as Record<string, { url?: string; body?: Record<string, unknown> }>)) {
      if (e?.url && /\/tattooists\/[^/?]+(\?|$)/.test(e.url) && String(e.body?.username ?? "").toLowerCase() === username) body = e.body!
    }
  } catch {
    return null
  }
  if (!body) return null
  const loc = (body.location ?? {}) as Record<string, unknown>
  const address = typeof loc.address === "string" ? loc.address : ""
  const lat = typeof loc.lat === "number" ? loc.lat : null
  const lng = typeof loc.lng === "number" ? loc.lng : null
  const links = [body.website, ...Object.values((body.social_links ?? {}) as Record<string, unknown>)].filter((x): x is string => typeof x === "string")
  const tiktok = links.map((l) => socialProfile(l)).find((s) => s?.platform === "tiktok")?.key ?? null
  return {
    has_email: typeof body.email === "string" && body.email.includes("@"),
    has_phone: typeof body.phone === "string" && /\d{7}/.test(body.phone.replace(/\D/g, "")),
    has_photo: body.photo_uploaded === true && typeof body.photo_url === "string",
    // "New York, NY, United States" is just the city; a digit or a place name is more.
    has_street: /\d/.test(address.replace(/\b\d{5}(-\d{4})?\b/g, "")) || (typeof loc.name === "string" && loc.name.trim() !== ""),
    has_zip: /\b\d{5}(-\d{4})?\b/.test(address),
    has_coords: lat !== null && lng !== null,
    coord_key: lat !== null && lng !== null ? `${lat.toFixed(4)},${lng.toFixed(4)}` : null,
    lat,
    lng,
    tiktok,
  }
}

/** Every private TattoosWizard artist, with what their cached page says. */
export function loadPrivate(): Candidate[] {
  const matchRows = parseCSV(fs.readFileSync(MATCH_FILE, "utf-8")).filter((r) => r.status === "artist_new_private")
  const urls = new Set(matchRows.map((r) => r.profile_url))
  const profiles = readJsonl<Profile>(PROFILES_FILE).filter((p) => urls.has(p.url))
  const empty: RawExtras = { has_email: false, has_phone: false, has_photo: false, has_street: false, has_zip: false, has_coords: false, coord_key: null, lat: null, lng: null, tiktok: null }
  return profiles.map((p) => ({ p, raw: readRaw(p.username) ?? empty }))
}

// ---- city centers -------------------------------------------------------------

export interface CityCenter {
  lat: number
  lng: number
  shops: number
  /** The spelling most of our shops use ("St. Petersburg"). */
  city: string
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Average of our active shops' coordinates per city + state, rounded to 2 decimals. */
export function cityCenters(shops: Record<string, unknown>[]): Map<string, CityCenter> {
  const acc = new Map<string, { lat: number; lng: number; n: number; names: Map<string, number> }>()
  for (const s of shops) {
    const lat = Number(s.latitude)
    const lng = Number(s.longitude)
    if (!s.city || !s.state || !Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) continue
    const key = placeKey(s.city, s.state)
    const a = acc.get(key) ?? { lat: 0, lng: 0, n: 0, names: new Map() }
    a.lat += lat
    a.lng += lng
    a.n++
    const name = String(s.city).trim()
    a.names.set(name, (a.names.get(name) ?? 0) + 1)
    acc.set(key, a)
  }
  const out = new Map<string, CityCenter>()
  for (const [key, a] of acc) {
    const names = Array.from(a.names.entries()).sort((x, y) => y[1] - x[1]).map(([n]) => n)
    out.set(key, { lat: round2(a.lat / a.n), lng: round2(a.lng / a.n), shops: a.n, city: names.find((n) => n !== n.toUpperCase()) ?? titleCase(names[0]) })
  }
  return out
}

export function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s\-'.])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase())
}

export { normCity, placeKey }

// ---- links --------------------------------------------------------------------

const BOOKING = /(^|\.)(vagaro\.com|booksy\.com|squareup\.com|square\.site|calendly\.com|acuityscheduling\.com|as\.me|fresha\.com|styleseat\.com|schedulicity\.com|setmore\.com|glossgenius\.com|tattoodo\.com|bookedin\.com|simplybook\.me|book\.squareup\.com|youcanbook\.me|picktime\.com|zohobookings\.com|appointy\.com|genbook\.com|getsquire\.com|boulevard\.io|joinblvd\.com|porter\.tattoo|tattooform\.com)$/i
const SOCIAL = /(^|\.)(instagram\.com|instagr\.am|facebook\.com|fb\.com|tiktok\.com|youtube\.com|youtu\.be|twitter\.com|x\.com|threads\.net|pinterest\.com)$/i

export function hostOf(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return null
  }
}

/** The page's website, sorted into booking_url or website_url; social links are neither. */
export function splitWebsite(url: string | null): { website_url: string | null; booking_url: string | null } {
  const host = hostOf(url)
  if (!url || !host) return { website_url: null, booking_url: null }
  const clean = /^https?:\/\//i.test(url) ? url.trim() : `https://${url.trim()}`
  if (BOOKING.test(host) || /(^|\.)book/.test(host)) return { website_url: null, booking_url: clean }
  if (SOCIAL.test(host)) return { website_url: null, booking_url: null }
  return { website_url: clean, booking_url: null }
}

/** Great-circle miles. */
export function milesBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = Math.PI / 180
  const x = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(x))
}
