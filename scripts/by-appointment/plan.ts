// scripts/by-appointment/plan.ts
// Sorts every private TattoosWizard artist into: insert, already listed
// (duplicate), junk, or held for review. Shared by inventory.ts and import.ts.
// Reads the database (artists, shops); writes nothing.

import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchAll } from "../lib/cleanup-utils"
import { withRetry } from "../lib/retry"
import { isPlaceholderName } from "../lib/artist-names"
import { dbHandle, nameKey } from "../tw/lib/normalize"
import { SUPPLY_SHOP, UNREADABLE, cleanName } from "../tw/lib/names"
import { socialProfile } from "../socials/lib/social"
import { STATE_ABBR_TO_NAME } from "../../lib/utils/states"
import { cityCenters, loadPrivate, milesBetween, placeKey, splitWebsite, styleRule, titleCase, type Candidate, type CityCenter } from "./lib"

// Same word lists as scripts/tw/import.ts.
const SHOP_WORDS = /\b(tattoos?|tattooing|studios?|piercing|parlou?r|collective|gallery|llc|inc|co|company)\b/i
const NOT_ARTIST = /\b(supply|supplies|products?|convention|expo|festival|aftercare|care|dot com|magazine|academy|school|removal)\b|\.com\b/i
// Could be a product brand ("Goliath Needles") or a person's nickname ("Ryan Needles").
const MAYBE_PRODUCT = /\b(irons|machines?|needles?|cartridges?|grips?|inks)\b/i
// "Tattoo Artist Sasha Masiuk", "Tattoos By Cody Dresser", "Tony ViLella - tattoo artist".
const PERSON_TAG = /\b(tattoo artist|tattooer|tattoos by|tattoo by|art by|ink by)\b/i
const GENERIC = /\b(tattoos?|tattooers?|tattooists?|tattooing|artists?|art|by|ink|the|fine ?line|black (and|&) gr[ae]y|custom|official|celebrity|national|usa|us)\b/gi

/** The non-Latin part dropped ("Claire 클레어" → "Claire"); "" if nothing Latin is left. */
function latinPart(name: string): string {
  return name.replace(/(?=\p{L})\P{Script=Latin}+/gu, " ").replace(/[^\p{L}\p{N}'&.\- ]+/gu, " ").replace(/\s+/g, " ").trim()
}

// Words that name a place or a role, never a person ("LA Tattoo Artist", "Private Tattoo Artist").
const NOT_A_NAME = new Set(["la", "nyc", "ny", "sf", "atl", "socal", "norcal", "bay area", "private", "actor", "local", "best", "top", "your", "pmu", "and"])

/** What's left of a name once "tattoo artist", generic words and a place name are taken out. */
function personRemainder(name: string, places: Set<string>): string {
  const s = name.toLowerCase().replace(PERSON_TAG, " ").replace(GENERIC, " ").replace(/[^a-z' ]+/g, " ").replace(/\s+/g, " ").trim()
  const words = s.split(" ").filter((w) => w && !NOT_A_NAME.has(w) && !(w.length === 2 && places.has(w)))
  const rest = words.join(" ")
  return !rest || places.has(rest) || NOT_A_NAME.has(rest) || words.every((w) => places.has(w)) ? "" : rest
}

// Spaced-out letters ("A S H L E Y K A Y") or decorative letters ("ᴛᴀᴛᴛᴏᴏꜱ") need a person to retype.
const needsCleanup = (name: string) => {
  const tokens = name.split(/\s+/)
  return (tokens.length >= 3 && tokens.filter((t) => t.length === 1).length >= tokens.length - 1) || /[\u1d00-\u1dbf\ua720-\ua7ff\u0250-\u02af]/u.test(name)
}

export type Outcome =
  | { kind: "insert"; record: Record<string, unknown> }
  | { kind: "duplicate"; reason: DupReason; artist_id: string; on_shop: boolean }
  | { kind: "junk"; reason: string }
  | { kind: "review"; reason: string }

export type DupReason =
  | "same Instagram as an active artist"
  | "same name + city as an active artist"
  | "same Instagram as a hidden artist"
  | "same Instagram as an active shop"
  | "same Instagram as another private profile"

export interface Planned {
  c: Candidate
  name: string
  city: string | null
  state: string | null
  center: CityCenter | null
  outcome: Outcome
}

export interface Snapshot {
  activeArtists: number
  shoplessActiveArtists: number
  centers: Map<string, CityCenter>
}

const slug = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")

export async function buildPlan(supabase: SupabaseClient): Promise<{ planned: Planned[]; snapshot: Snapshot }> {
  const artists = await withRetry("fetch artists", () =>
    fetchAll<Record<string, unknown>>(supabase, "artists", "id, display_name, city, state, instagram_handle, shop_id, is_active, handle"),
  )
  const shops = await withRetry("fetch shops", () =>
    fetchAll<Record<string, unknown>>(supabase, "shops", "id, city, state, latitude, longitude, is_active, possibly_closed, instagram_url"),
  )
  const centers = cityCenters(shops.filter((s) => s.is_active === true))
  const places = new Set<string>([
    ...Array.from(centers.values()).map((c) => c.city.toLowerCase().replace(/[^a-z' ]+/g, " ").replace(/\s+/g, " ").trim()),
    ...Object.keys(STATE_ABBR_TO_NAME).map((a) => a.toLowerCase()),
    ...Object.values(STATE_ABBR_TO_NAME).map((n) => n.toLowerCase()),
  ])

  const activeByIg = new Map<string, Record<string, unknown>>()
  const hiddenByIg = new Map<string, Record<string, unknown>>()
  const activeByName = new Map<string, Record<string, unknown>>()
  const taken = new Set<string>()
  for (const a of artists) {
    if (a.handle) taken.add(String(a.handle))
    const ig = dbHandle(a.instagram_handle)
    if (a.is_active === true) {
      if (ig && !activeByIg.has(ig)) activeByIg.set(ig, a)
      const k = `${nameKey(a.display_name)}|${placeKey(a.city, a.state)}`
      if (nameKey(a.display_name) && !activeByName.has(k)) activeByName.set(k, a)
    } else if (ig && !hiddenByIg.has(ig)) hiddenByIg.set(ig, a)
  }
  const shopIg = new Set<string>()
  for (const s of shops) {
    if (s.is_active !== true || !s.instagram_url) continue
    const key = socialProfile(String(s.instagram_url))?.key
    if (key) shopIg.add(key)
  }

  // Two private pages with one Instagram: keep the most-followed one.
  const cands = loadPrivate().sort((a, b) => (b.p.instagram_followers ?? 0) - (a.p.instagram_followers ?? 0))
  const seenIg = new Set<string>()

  const planned: Planned[] = cands.map((c) => {
    const p = c.p
    const cleaned = p.name ? cleanName(p.name.normalize("NFKD").replace(/\p{M}/gu, "")).normalize("NFC") : ""
    const name = UNREADABLE.test(cleaned) ? latinPart(cleaned) : cleaned
    const center = p.city && p.state ? centers.get(placeKey(p.city, p.state)) ?? null : null
    const city = p.city ? center?.city ?? titleCase(p.city) : null
    const base = { c, name, city, state: p.state, center }
    const ig = p.instagram_handle

    // Junk first: nothing to list.
    const messy = !!name && needsCleanup(name)
    if (!messy && (!/[A-Za-z]{2,}/.test(name) || isPlaceholderName(name) || /^tattoo artist$/i.test(name))) return { ...base, outcome: { kind: "junk", reason: "no usable name" } }
    if (p.country !== "US") return { ...base, outcome: { kind: "junk", reason: "not US-based" } }
    if (!p.city || !p.state) return { ...base, outcome: { kind: "junk", reason: "no city" } }
    if (NOT_ARTIST.test(name) || SUPPLY_SHOP.test(name)) return { ...base, outcome: { kind: "junk", reason: "not an artist (supply, product, event)" } }

    // Already with us.
    const dupIg = ig ? activeByIg.get(ig) : undefined
    if (dupIg) return { ...base, outcome: { kind: "duplicate", reason: "same Instagram as an active artist", artist_id: String(dupIg.id), on_shop: !!dupIg.shop_id } }
    const dupName = activeByName.get(`${nameKey(name)}|${placeKey(p.city, p.state)}`) ?? activeByName.get(`${nameKey(p.name)}|${placeKey(p.city, p.state)}`)
    if (dupName) return { ...base, outcome: { kind: "duplicate", reason: "same name + city as an active artist", artist_id: String(dupName.id), on_shop: !!dupName.shop_id } }
    const hidden = ig ? hiddenByIg.get(ig) : undefined
    if (hidden) return { ...base, outcome: { kind: "duplicate", reason: "same Instagram as a hidden artist", artist_id: String(hidden.id), on_shop: !!hidden.shop_id } }
    if (ig && shopIg.has(ig)) return { ...base, outcome: { kind: "duplicate", reason: "same Instagram as an active shop", artist_id: "", on_shop: true } }
    if (ig && seenIg.has(ig)) return { ...base, outcome: { kind: "duplicate", reason: "same Instagram as another private profile", artist_id: "", on_shop: false } }
    if (ig) seenIg.add(ig)

    // Listable, but a person should look first.
    if (messy) return { ...base, outcome: { kind: "review", reason: "name needs cleanup (spaced or decorative letters)" } }
    if (MAYBE_PRODUCT.test(name)) return { ...base, outcome: { kind: "review", reason: "may be a product brand" } }
    // "Denver's Competitive Ink", "Westside Ink": a brand, not a person.
    if (/\S\s+ink$/i.test(name)) return { ...base, outcome: { kind: "review", reason: "named like a shop or brand" } }
    if (SHOP_WORDS.test(name) && !(PERSON_TAG.test(name) && personRemainder(name, places))) return { ...base, outcome: { kind: "review", reason: "named like a shop or brand" } }
    if (p.guest_or_traveling) return { ...base, outcome: { kind: "review", reason: "traveling / guest spots only" } }
    if (!center) return { ...base, outcome: { kind: "review", reason: "no city center (we have no shops in that city)" } }
    // Belt and braces: the center never comes from the artist, but if their page
    // also shows a street address and the center happens to sit near it, hold it.
    if (c.raw.has_street && c.raw.lat !== null && c.raw.lng !== null && milesBetween(c.raw.lat, c.raw.lng, center.lat, center.lng) < 0.5)
      return { ...base, outcome: { kind: "review", reason: "city center falls near the address on their page" } }

    const namePart = slug(name) || slug((ig ?? "").replace(/[._]/g, " ")) || "artist"
    const handleBase = `${namePart}--${slug(city!)}-${p.state!.toLowerCase()}`
    let handle = handleBase
    for (let n = 2; taken.has(handle); n++) handle = `${handleBase}-${n}`
    taken.add(handle)
    const links = splitWebsite(p.website)
    const record: Record<string, unknown> = {
      display_name: name,
      handle,
      instagram_handle: ig,
      instagram_followers: p.instagram_followers,
      instagram_checked_at: p.instagram_followers !== null && p.followers_checked_at ? new Date(`${p.followers_checked_at.slice(0, 10)}T00:00:00Z`).toISOString() : null,
      tiktok_handle: c.raw.tiktok,
      styles: styleRule(p),
      website_url: links.website_url,
      booking_url: links.booking_url,
      shop_id: null,
      city,
      state: p.state,
      works_by_appointment: true,
      area_latitude: center.lat,
      area_longitude: center.lng,
      is_active: true,
      is_claimed: false,
      source: "tattooswizard",
    }
    return { ...base, outcome: { kind: "insert", record } }
  })

  return {
    planned,
    snapshot: {
      activeArtists: artists.filter((a) => a.is_active === true).length,
      shoplessActiveArtists: artists.filter((a) => a.is_active === true && !a.shop_id).length,
      centers,
    },
  }
}
