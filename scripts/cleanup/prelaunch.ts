// scripts/cleanup/prelaunch.ts — Step 4: pre-launch data cleanup.
//
// Never deletes rows: listings and artists are hidden with is_active=false,
// and fields are only filled when empty. The exceptions, both asked for:
// Part C rewrites display_name, Part E clears broken avatar_url values.
//   A. Listings that aren't tattoo shops (supply companies, expos, conventions):
//      hidden. Their artists are hidden too; when the same person (normalized
//      name) is active at exactly one real shop, that row first gets the copy's
//      Instagram handle, followers and styles (empty fields only).
//   B. Duplicate listings: same normalized name AND (within 150 m, or the same
//      normalized street address in the same city). Keeper = most reviews, then
//      most of Instagram / website / phone / hours / photo, then oldest; a claimed
//      listing always keeps. Active artists move to the keeper unless it already
//      has that name (those copies are hidden); shop_artists stubs move the same
//      way; the keeper's empty fields are filled; the duplicates are hidden.
//   C. Artist display names: tagline endings ("Tattoo Artist", "Tattooer", plus
//      a city or state next to them) removed; ALL-CAPS names title-cased; definite
//      non-names hidden; odd ones listed in data/reports/names-review.csv.
//      Claimed artists are never touched.
//   D. Shops with a dead or parked website and no reviews, no Instagram and no
//      active artists: possibly_closed = true (hidden from the finder and map).
//   E. Active artists' avatar_url: HEAD request, 8 at a time, 5 s timeout. 404,
//      410 or two failed connections → avatar_url = null.
//
// Run: npx tsx scripts/cleanup/prelaunch.ts [--apply]
//   Dry run by default: writes data/reports/prelaunch-dryrun.json (the plan),
//   prelaunch-report.md and the CSVs listed in the report.
//   --apply recomputes and stops if parts A–D differ from the dry run. Photos
//   cleared in the dry run are checked once more; any that load now are kept.
//   Undo: npx tsx scripts/cleanup/undo-prelaunch.ts --input <log> [--apply]

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { getSupabaseAdmin } from "../lib/supabase-admin"
import { UndoLog } from "../lib/undo-log"
import {
  UnionFind,
  coords,
  fetchAll,
  fetchIn,
  haversineMeters,
  normalizeName,
  normalizePhone,
  runPool,
  modeBanner,
  writeCsv,
} from "../lib/cleanup-utils"
import { withRetry } from "../lib/retry"
import { normalizeArtistName } from "../lib/artist-names"
import { normalizeAddressForGeocoding } from "../lib/address-normalize"
import { DICT, USER_AGENT } from "../socials/lib/common"

const APPLY = process.argv.includes("--apply")
const SCRIPT = "prelaunch-cleanup"
const REPORT_DIR = path.resolve("data/reports")
const CACHE_DIR = path.resolve("data/cache/prelaunch")
const PHOTO_CACHE = path.join(CACHE_DIR, "avatar-checks.json")
const PLAN_FILE = path.join(REPORT_DIR, "prelaunch-dryrun.json")
const REPORT_FILE = path.join(REPORT_DIR, APPLY ? "prelaunch-report.applied.md" : "prelaunch-report.md")
const CANDIDATES_CSV = path.join(REPORT_DIR, "prelaunch-partA-candidates.csv")
const PART_A_ARTISTS_CSV = path.join(REPORT_DIR, "prelaunch-partA-artists.csv")
const MERGES_CSV = path.join(REPORT_DIR, "prelaunch-partB-merges.csv")
const NAME_CHANGES_CSV = path.join(REPORT_DIR, "prelaunch-partC-names.csv")
const NAMES_REVIEW_CSV = path.join(REPORT_DIR, "names-review.csv")
const CLOSED_CSV = path.join(REPORT_DIR, "prelaunch-partD-possibly-closed.csv")
const PHOTOS_CSV = path.join(REPORT_DIR, "prelaunch-partE-photos.csv")

const DUP_RADIUS_M = 150
const PHOTO_CONCURRENCY = 8
const PHOTO_TIMEOUT_MS = 5000

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const SHOP_COLUMNS =
  "id, name, slug, address, city, state, zip, phone, website, email, description, cover_image_url, logo_url, rating, review_count, " +
  "latitude, longitude, google_maps_url, hours, owner_user_id, created_at, is_active, possibly_closed, instagram_url, " +
  "instagram_followers, instagram_checked_at, facebook_url, tiktok_url, youtube_url, website_status, website_checked_at"
const ARTIST_COLUMNS =
  "id, display_name, shop_id, city, state, user_id, is_claimed, is_active, instagram_handle, instagram_followers, " +
  "instagram_checked_at, styles, avatar_url, created_at"

const empty = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0)
const claimed = (a: Row) => a.is_claimed === true || a.user_id != null
const place = (s: Row) => [s.city, s.state].filter(Boolean).join(", ")
const fmt = (n: number) => n.toLocaleString("en-US")

// ── Writes ───────────────────────────────────────────────────────────────────

interface Write {
  part: "A" | "B" | "C" | "D" | "E"
  table: "shops" | "artists" | "shop_artists"
  id: string
  field: string
  old: unknown
  value: unknown
}
const writeKey = (w: Write) => `${w.table}|${w.id}|${w.field}|${JSON.stringify(w.value)}`

// ── Part A rules ─────────────────────────────────────────────────────────────

const SUPPLY_WORD = /\b(suppl(y|ies)|products?|expos?|conventions?|festivals?|offices)\b/i
const EVENT_WORD = /\b(expos?|conventions?|festivals?)\b/i
const SHOP_WORD = /\b(studios?|parlou?rs?|tattoos|shops?|galler(y|ies))\b/i
const ALWAYS_NOT_A_SHOP = [
  "Bishop Tattoo Supply Offices",
  "INK-EEZE Tattoo products",
  "Intenze Products Inc",
  "WorldWide Tattoo Supply",
  "True Tattoo Supply",
  "Portland Tattoo Expo",
  "Body Art Expo",
  "The All American Tattoo Convention",
]
// Step 2's expo listings (their sites listed 144 and 201 people).
const EXPO_DOMAINS = ["pittsburghtattooexpo.com", "themotorcitytattooexpo.com"]
const hostOf = (url: unknown) => {
  try {
    const s = String(url ?? "").trim()
    return s ? new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`).hostname.replace(/^www\./, "").toLowerCase() : ""
  } catch {
    return ""
  }
}

// ── Part B rules ─────────────────────────────────────────────────────────────

const STREET_ABBR: Record<string, string> = {
  street: "st", avenue: "ave", av: "ave", road: "rd", boulevard: "blvd", drive: "dr", lane: "ln", court: "ct",
  place: "pl", parkway: "pkwy", highway: "hwy", hiway: "hwy", suite: "ste", north: "n", south: "s", east: "e",
  west: "w", northeast: "ne", northwest: "nw", southeast: "se", southwest: "sw", terrace: "ter", circle: "cir",
  square: "sq", trail: "trl", plaza: "plz", center: "ctr", centre: "ctr", turnpike: "tpke", expressway: "expy",
  freeway: "fwy", way: "wy", mount: "mt", saint: "st", first: "1st", second: "2nd", third: "3rd", fourth: "4th",
  fifth: "5th", sixth: "6th", seventh: "7th", eighth: "8th", ninth: "9th", tenth: "10th",
}
function streetKey(s: Row): string {
  const street = String(s.address ?? "").split(",")[0].trim()
  if (!/\d/.test(street)) return "" // "Downtown Mall" isn't a street address
  return normalizeAddressForGeocoding(street.replace(/\./g, ""))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // "Kālia Rd" = "Kalia Rd"
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => STREET_ABBR[t] ?? t)
    .join(" ")
}
const cityKey = (s: Row) => `${normalizeName(s.city)}|${String(s.state ?? "").toUpperCase()}`
const KEEPER_FIELDS = ["instagram_url", "website", "phone", "hours", "photo"] as const
const keeperFilled = (s: Row) =>
  KEEPER_FIELDS.filter((f) => (f === "photo" ? !empty(s.cover_image_url) || !empty(s.logo_url) : !empty(s[f]))).length
// Filled together, from one duplicate, only when the keeper's first field is empty.
const FILL_GROUPS: string[][] = [
  ["website", "website_status", "website_checked_at"],
  ["instagram_url", "instagram_followers", "instagram_checked_at"],
  ["latitude", "longitude"],
  ["phone"], ["email"], ["description"], ["cover_image_url"], ["logo_url"], ["hours"], ["facebook_url"],
  ["tiktok_url"], ["youtube_url"], ["google_maps_url"], ["address"], ["zip"],
]

// ── Part C rules ─────────────────────────────────────────────────────────────

const STATE_NAMES: Record<string, string> = {
  AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california", CO: "colorado", CT: "connecticut",
  DE: "delaware", FL: "florida", GA: "georgia", HI: "hawaii", ID: "idaho", IL: "illinois", IN: "indiana", IA: "iowa",
  KS: "kansas", KY: "kentucky", LA: "louisiana", ME: "maine", MD: "maryland", MA: "massachusetts", MI: "michigan",
  MN: "minnesota", MS: "mississippi", MO: "missouri", MT: "montana", NE: "nebraska", NV: "nevada", NH: "new hampshire",
  NJ: "new jersey", NM: "new mexico", NY: "new york", NC: "north carolina", ND: "north dakota", OH: "ohio",
  OK: "oklahoma", OR: "oregon", PA: "pennsylvania", RI: "rhode island", SC: "south carolina", SD: "south dakota",
  TN: "tennessee", TX: "texas", UT: "utah", VT: "vermont", VA: "virginia", WA: "washington", WV: "west virginia",
  WI: "wisconsin", WY: "wyoming", DC: "district of columbia",
}
const SEP = "[\\s,|:•·\\-–—/]"
const TAGLINE = new RegExp(`^(.*?)${SEP}*\\b(?:tattoo\\s*artists?|tattooers?)\\b${SEP}*(?:(?:in|from|based\\s+in)\\s+)?(.*?)${SEP}*$`, "i")
// Handle-style names ("Gordn.ink") aren't web addresses; they go to review.
const URL_LIKE = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|biz|info)\b/i
const EMAIL = /\S+@\S+\.\S+/
const NON_NAME_PHRASE = /book\s*now|appointment|our\s+team|\?/i
const PAGE_WORDS = new Set([
  "services", "social media", "next dates", "contact", "contact us", "gallery", "about", "about us", "home",
  "booking", "faq", "faqs", "aftercare", "portfolio", "testimonials", "pricing", "privacy policy", "our artists",
  "meet the team", "menu", "events", "blog", "news", "store",
])
// Left over after a tagline is removed, these mean what's left isn't a person ("Cody Dean Floral").
const NOT_A_PERSON_WORD = /\b(the|ink|tattoos?|studio|anime|floral|realism|traditional|blackwork|portrait|custom|licensed|known|best|famous)\b/i
const SLOGAN_WORD = /\b(tattoos?|tattooing|ink|inked|studio|lets|let's|let’s|your|we|our|best|custom|welcome|walk[- ]?ins?)\b|!/i

/** Text with letters, every letter upper case. */
const allCaps = (s: string) => /\p{Lu}/u.test(s) && !/\p{Ll}/u.test(s)
/** ≤2 letters, or 3 with no vowel, or a Roman numeral: initials and suffixes ("DJ", "AJ", "JR", "III"). */
const keepCaps = (w: string) => {
  const letters = w.replace(/[^\p{L}]/gu, "")
  return letters.length <= 2 || (letters.length === 3 && !/[AEIOUY]/.test(letters)) || /^(II|III|IV|VI|VII)$/.test(letters)
}
function titleCase(name: string): string {
  return name
    .split(" ")
    .map((w) => (keepCaps(w) ? w : w.toLowerCase().replace(/(^|[\-'’.(/"“])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase())))
    .join(" ")
}

/**
 * Removes a trailing state code (upper case, "FL"), state name or city from
 * `s`, once. Names and cities only when two words are left, so a surname that
 * is also the city ("Mike Jackson" in Jackson) stays.
 */
function stripPlace(s: string, cities: string[]): string {
  const t = s.replace(new RegExp(`${SEP}+$`), "")
  const m = t.match(/^(.*?)[\s,]+([A-Z]{2})$/)
  if (m && STATE_NAMES[m[2]]) return m[1]
  const lower = t.toLowerCase()
  for (const p of [...Object.values(STATE_NAMES), ...cities]) {
    if (!p || !(lower.endsWith(` ${p}`) || lower.endsWith(`,${p}`))) continue
    const rest = t.slice(0, t.length - p.length - 1).replace(new RegExp(`${SEP}+$`), "")
    if (rest.trim().split(/\s+/).length >= 2) return rest
  }
  return t
}
function isPlace(s: string, cities: string[]): boolean {
  let rest = s.trim()
  for (let i = 0; i < 3 && rest; i++) {
    const next = stripPlace(` ${rest}`, cities).trim()
    if (next === rest.trim()) break
    rest = next
  }
  if (!rest) return true
  const lower = rest.toLowerCase()
  return (/^[A-Z]{2}$/.test(rest) && !!STATE_NAMES[rest]) || Object.values(STATE_NAMES).includes(lower) || cities.includes(lower)
}

type NameDecision =
  | { kind: "keep" }
  | { kind: "rename"; to: string; why: string }
  | { kind: "hide"; why: string }
  | { kind: "review"; why: string }

// Every city in the shops table (lower case), set by buildPlan: "Charleston
// Tattooer" leaves a place, not a person, even when it isn't the artist's city.
const ALL_CITIES = new Set<string>()
const STATE_NAME_SET = new Set(Object.values(STATE_NAMES))
const endsWithPlace = (s: string) => {
  const w = s.toLowerCase().replace(/[^a-z ]/g, " ").trim().split(/\s+/)
  return [1, 2, 3].some((n) => w.length >= n && (ALL_CITIES.has(w.slice(-n).join(" ")) || STATE_NAME_SET.has(w.slice(-n).join(" "))) && (n === w.length || STATE_NAME_SET.has(w.slice(-n).join(" "))))
}

export function decideName(raw: string, cities: string[]): NameDecision {
  const name = raw.trim()
  if (EMAIL.test(name)) return { kind: "hide", why: "contains an email" }
  if (URL_LIKE.test(name)) return { kind: "hide", why: "contains a web address" }
  const phrase = name.match(NON_NAME_PHRASE)
  if (phrase) return { kind: "hide", why: `contains "${phrase[0].toLowerCase()}"` }
  if (PAGE_WORDS.has(name.toLowerCase().replace(/[^a-z ]/g, "").trim())) return { kind: "hide", why: "page word" }

  let out = name
  const whys: string[] = []
  const m = out.match(TAGLINE)
  if (m) {
    let head = m[1].trim()
    const tail = m[2].trim()
    if (head && /\p{L}/u.test(head) && (!tail || isPlace(tail, cities))) {
      for (let i = 0; i < 3; i++) {
        const next = stripPlace(head, cities).trim()
        if (next === head || !/\p{L}/u.test(next)) break
        head = next
      }
      head = head.replace(new RegExp(`^${SEP}+|${SEP}+$`, "g"), "").trim()
      // "Joe the Tattooer", "Ink by Tattoo Artist": the tagline is part of the name.
      if (!/\b(the|a|an|your|by|and|&|of|for)$/i.test(head)) {
        // "Bend Oregon Tattoo Artist", "Serene Ink Tattoo Artist": no person's name to keep.
        if (isPlace(head, cities) || endsWithPlace(head) || NOT_A_PERSON_WORD.test(head)) return { kind: "review", why: "tagline, but what's left isn't clearly a name" }
        out = head
        whys.push("tagline removed")
      }
    }
  }
  if (allCaps(out) && out.replace(/[^\p{L}]/gu, "").length > 3) {
    const tc = titleCase(out)
    if (tc !== out) {
      out = tc
      whys.push("title-cased")
    }
  }

  const odd = oddName(out)
  if (out !== name) return { kind: "rename", to: out, why: whys.join(", ") + (odd ? ` (also in review: ${odd})` : "") }
  return odd ? { kind: "review", why: odd } : { kind: "keep" }
}

function oddName(name: string): string | null {
  if (/\d/.test(name)) return "has digits"
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length >= 5) return "long, reads like a slogan"
  if (SLOGAN_WORD.test(name)) return "slogan or shop words"
  if (/\btattoo\s*artist|tattooer/i.test(name)) return "tagline left in (not at the end)"
  if (words.length === 1) {
    const w = words[0].replace(/[^\p{L}]/gu, "")
    const lower = w.toLowerCase()
    const cap = lower.charAt(0).toUpperCase() + lower.slice(1)
    if (w.length >= 4 && DICT.has(cap)) return null // a first name in the word list ("Brandon")
    if (w.length >= 4 && DICT.has(lower)) return "single common English word"
    // Two words of 4+ letters run together ("Hometown", "Milkshake").
    for (let i = 4; i <= lower.length - 4; i++)
      if (DICT.has(lower.slice(0, i)) && DICT.has(lower.slice(i)) && !DICT.has(cap)) return "single word made of common English words"
  }
  return null
}

// ── Part E ───────────────────────────────────────────────────────────────────

type PhotoResult = { status: number | null; error: string | null; checked_at: string }
type PhotoVerdict = "ok" | "gone" | "unreachable" | "other"
const photoVerdict = (r: PhotoResult): PhotoVerdict =>
  r.status === 404 || r.status === 410 ? "gone" : r.status == null ? "unreachable" : r.status < 400 ? "ok" : "other"

async function headOnce(url: string): Promise<PhotoResult> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), PHOTO_TIMEOUT_MS)
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": USER_AGENT } })
    return { status: res.status, error: null, checked_at: new Date().toISOString() }
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } }
    return { status: null, error: err.name === "AbortError" ? "timeout" : err.cause?.code ?? err.message, checked_at: new Date().toISOString() }
  } finally {
    clearTimeout(timer)
  }
}
/** One HEAD; a failed connection is tried once more. "//host/x.jpg" is checked as https. */
async function checkPhoto(raw: string): Promise<PhotoResult> {
  const url = raw.startsWith("//") ? `https:${raw}` : raw
  if (!/^https?:\/\//i.test(url)) return { status: null, error: "not a full web address", checked_at: new Date().toISOString() }
  const first = await headOnce(url)
  if (first.status != null) return first
  await new Promise((r) => setTimeout(r, 1000))
  return headOnce(url)
}

// ── Plan ─────────────────────────────────────────────────────────────────────

async function buildPlan(supabase: ReturnType<typeof getSupabaseAdmin>, photoChecks: Map<string, PhotoResult>, checkPhotos: boolean) {
  const shops = await withRetry("fetch active shops", () => fetchAll<Row>(supabase, "shops", SHOP_COLUMNS, (q) => q.eq("is_active", true)))
  const artists = await withRetry("fetch active artists", () => fetchAll<Row>(supabase, "artists", ARTIST_COLUMNS, (q) => q.eq("is_active", true)))
  const shopById = new Map(shops.map((s) => [String(s.id), s]))
  for (const s of shops) if (s.city) ALL_CITIES.add(String(s.city).toLowerCase().trim())
  const before = {
    shops: shops.length,
    listed: shops.filter((s) => !s.possibly_closed).length,
    artists: artists.length,
  }
  const writes: Write[] = []
  const problems: string[] = []
  // Live state, updated as the plan goes, so later parts see earlier ones.
  const hiddenShops = new Set<string>()
  const hiddenArtists = new Set<string>()
  const artistShop = new Map(artists.map((a) => [String(a.id), String(a.shop_id ?? "")]))
  const artistById = new Map(artists.map((a) => [String(a.id), a]))
  const activeArtistsAt = (shopId: string) => artists.filter((a) => !hiddenArtists.has(a.id) && artistShop.get(a.id) === shopId)
  const hideArtist = (part: Write["part"], a: Row) => {
    hiddenArtists.add(a.id)
    writes.push({ part, table: "artists", id: a.id, field: "is_active", old: true, value: false })
  }
  /** Copies the Instagram handle, followers and styles from `from` onto `to`, empty fields only. */
  const fillArtist = (part: Write["part"], to: Row, from: Row): string[] => {
    const filled: string[] = []
    const set = (field: string) => {
      writes.push({ part, table: "artists", id: to.id, field, old: to[field] ?? null, value: from[field] })
      to[field] = from[field]
      filled.push(field)
    }
    if (empty(to.instagram_handle) && !empty(from.instagram_handle)) set("instagram_handle")
    const sameIg = String(to.instagram_handle ?? "").toLowerCase() === String(from.instagram_handle ?? "").toLowerCase()
    if (sameIg && empty(to.instagram_followers) && !empty(from.instagram_followers)) {
      set("instagram_followers")
      if (empty(to.instagram_checked_at) && !empty(from.instagram_checked_at)) set("instagram_checked_at")
    }
    if (empty(to.styles) && !empty(from.styles)) set("styles")
    return filled
  }

  // ── A ────────────────────────────────────────────────────────────────────
  const forced = new Set(ALWAYS_NOT_A_SHOP.map(normalizeName))
  const forcedFound = new Set<string>()
  const candidates: Row[] = []
  for (const s of shops) {
    const host = hostOf(s.website)
    const expoSite = EXPO_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))
    if (!SUPPLY_WORD.test(s.name) && !expoSite) continue
    const isForced = forced.has(normalizeName(s.name)) || expoSite
    if (forced.has(normalizeName(s.name))) forcedFound.add(normalizeName(s.name))
    const group = isForced || EVENT_WORD.test(s.name) || !SHOP_WORD.test(s.name) ? "likely_not_a_shop" : "likely_real_shop"
    const tattooAndSupply = /\btattoos?\b.*\b(and|&|\+)\b.*\bsuppl/i.test(s.name) || /piercing/i.test(s.name)
    const eventShop = EVENT_WORD.test(s.name) && !/tattoo (arts? )?(expo|convention|festival)|body art expo/i.test(s.name)
    const check =
      group === "likely_not_a_shop" && !isForced
        ? [
            (s.review_count ?? 0) >= 20 && `${s.review_count} reviews`,
            activeArtistsAt(s.id).length > 0 && "has artists",
            tattooAndSupply && "name reads as a tattoo shop that also sells supplies",
            eventShop && "event word is part of a shop name",
          ].filter(Boolean).join("; ")
        : ""
    candidates.push({
      group,
      check,
      reason: isForced ? (expoSite ? "Step 2 expo listing" : "on the always list") : group === "likely_not_a_shop" ? (EVENT_WORD.test(s.name) ? "event word" : "supply word, no shop word") : "has a shop word",
      shop_id: s.id,
      name: s.name,
      city: place(s),
      artists: activeArtistsAt(s.id).length,
      website: s.website ?? "",
      reviews: s.review_count ?? 0,
      owner: s.owner_user_id ? "claimed" : "",
    })
  }
  for (const n of ALWAYS_NOT_A_SHOP) if (!forcedFound.has(normalizeName(n))) problems.push(`Part A: "${n}" from the always list isn't an active listing (already hidden or renamed).`)
  for (const d of EXPO_DOMAINS) if (!candidates.some((c) => hostOf(c.website).endsWith(d))) problems.push(`Part A: no active listing has the website ${d}.`)
  candidates.sort((a, b) => a.group.localeCompare(b.group) || String(a.name).localeCompare(String(b.name)))

  const notAShop = candidates.filter((c) => c.group === "likely_not_a_shop")
  for (const c of notAShop) {
    if (c.owner) {
      problems.push(`Part A: ${c.name} (${c.city}) is claimed by an owner, so it was left visible.`)
      continue
    }
    hiddenShops.add(c.shop_id)
    writes.push({ part: "A", table: "shops", id: c.shop_id, field: "is_active", old: true, value: false })
  }
  const byNorm = new Map<string, Row[]>()
  for (const a of artists) {
    const n = normalizeArtistName(a.display_name)
    if (n) byNorm.set(n, [...(byNorm.get(n) ?? []), a])
  }
  // One match, or, with several, the nearest one in the listing's state when
  // it's less than half as far as the next ("Carlos Torres" in Long Beach, not Lancaster).
  const pickSamePerson = (others: Row[], listing: Row): Row | null => {
    if (others.length === 1) return others[0]
    const lc = coords(listing)
    if (!lc) return null
    const ranked = others
      .map((o) => ({ o, shop: shopById.get(artistShop.get(o.id)!)! }))
      .map((x) => ({ ...x, c: coords(x.shop) }))
      .filter((x) => x.c)
      .map((x) => ({ ...x, m: haversineMeters(lc[0], lc[1], x.c![0], x.c![1]) }))
      .sort((a, b) => a.m - b.m)
    if (ranked.length < 2 || ranked[0].shop.state !== listing.state) return null
    return ranked[0].m * 2 < ranked[1].m ? ranked[0].o : null
  }
  const partAArtists: Row[] = []
  for (const c of notAShop) {
    if (!hiddenShops.has(c.shop_id)) continue
    for (const a of activeArtistsAt(c.shop_id)) {
      const n = normalizeArtistName(a.display_name)
      const others = (byNorm.get(n) ?? []).filter((o) => o.id !== a.id && !hiddenArtists.has(o.id) && !hiddenShops.has(artistShop.get(o.id)!) && shopById.has(artistShop.get(o.id)!))
      const row: Row = { artist_id: a.id, artist: a.display_name, listing: c.name, listing_city: c.city, instagram: a.instagram_handle ?? "", outcome: "", other_shop: "", filled: "" }
      if (claimed(a)) {
        row.outcome = "left active (claimed profile)"
        problems.push(`Part A: ${a.display_name} at ${c.name} has a claimed profile, so it stays active on a hidden listing.`)
      } else if (pickSamePerson(others, shopById.get(c.shop_id)!)) {
        const o = pickSamePerson(others, shopById.get(c.shop_id)!)!
        const shop = shopById.get(artistShop.get(o.id)!)!
        row.outcome = "merged into the same person at a real shop"
        row.other_shop = `${o.display_name} at ${shop.name}, ${place(shop)}`
        row.filled = fillArtist("A", o, a).join(" ")
        hideArtist("A", a)
      } else {
        row.outcome = others.length > 1 ? `hidden (same name at ${others.length} shops, not merged)` : "hidden"
        hideArtist("A", a)
      }
      partAArtists.push(row)
    }
  }

  // ── B ────────────────────────────────────────────────────────────────────
  const pool = shops.filter((s) => !hiddenShops.has(s.id))
  const byName = new Map<string, Row[]>()
  for (const s of pool) {
    const n = normalizeName(s.name)
    if (n) byName.set(n, [...(byName.get(n) ?? []), s])
  }
  const link = (a: Row, b: Row): { meters: number | null; how: string } | null => {
    const ca = coords(a)
    const cb = coords(b)
    const meters = ca && cb ? haversineMeters(ca[0], ca[1], cb[0], cb[1]) : null
    if (meters != null && meters <= DUP_RADIUS_M) return { meters, how: "within 150 m" }
    const ka = streetKey(a)
    if (ka && ka === streetKey(b) && (cityKey(a) === cityKey(b) || (a.zip && a.zip === b.zip))) return { meters, how: "same street address" }
    return null
  }
  const uf = new UnionFind()
  for (const group of byName.values()) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) if (link(group[i], group[j])) uf.union(group[i].id, group[j].id)
  }
  const clusters = new Map<string, Row[]>()
  for (const group of byName.values()) {
    if (group.length < 2) continue
    for (const s of group) {
      const r = uf.find(s.id)
      clusters.set(r, [...(clusters.get(r) ?? []), s])
    }
  }
  const stubs = await withRetry("fetch shop_artists", () =>
    fetchIn<Row>(supabase, "shop_artists", "id, shop_id, name", "shop_id", Array.from(clusters.values()).filter((c) => c.length > 1).flat().map((s) => s.id)),
  )
  const merges: Row[] = []
  let partBMoved = 0
  let partBArtistsHidden = 0
  let partBFieldsFilled = 0
  let partBStubsMoved = 0
  let phoneConflicts = 0
  for (const cluster of clusters.values()) {
    if (cluster.length < 2) continue
    const owned = cluster.filter((s) => s.owner_user_id)
    if (owned.length > 1) {
      problems.push(`Part B: ${cluster[0].name} (${place(cluster[0])}) has ${owned.length} claimed listings; left alone.`)
      continue
    }
    const keeper = owned[0] ?? [...cluster].sort(
      (a, b) => (b.review_count ?? 0) - (a.review_count ?? 0) || keeperFilled(b) - keeperFilled(a) || String(a.created_at).localeCompare(String(b.created_at)),
    )[0]
    const dupes: { shop: Row; meters: number | null; how: string }[] = []
    for (const s of cluster) {
      if (s === keeper) continue
      const l = link(keeper, s)
      if (!l) {
        problems.push(`Part B: ${s.name} (${place(s)}, ${s.id}) only matches the keeper through another listing; left alone.`)
        continue
      }
      dupes.push({ shop: s, ...l })
    }
    if (!dupes.length) continue
    if (keeper.possibly_closed && dupes.some((d) => !d.shop.possibly_closed))
      problems.push(`Part B: the keeper for ${keeper.name} (${place(keeper)}) is marked possibly closed but a duplicate isn't, so the shop drops out of the finder.`)
    dupes.sort((a, b) => (b.shop.review_count ?? 0) - (a.shop.review_count ?? 0) || keeperFilled(b.shop) - keeperFilled(a.shop))

    // Fill the keeper's empty fields.
    const filled: string[] = []
    for (const fields of FILL_GROUPS) {
      if (!empty(keeper[fields[0]])) continue
      const src = dupes.find((d) => !empty(d.shop[fields[0]]))?.shop
      if (!src) continue
      for (const f of fields) {
        if (f !== fields[0] && (!empty(keeper[f]) || empty(src[f]))) continue
        writes.push({ part: "B", table: "shops", id: keeper.id, field: f, old: keeper[f] ?? null, value: src[f] })
        keeper[f] = src[f]
        filled.push(f)
      }
    }
    if (!empty(keeper.instagram_url) && empty(keeper.instagram_followers)) {
      const src = dupes.find((d) => d.shop.instagram_url === keeper.instagram_url && !empty(d.shop.instagram_followers))?.shop
      if (src) {
        for (const f of ["instagram_followers", "instagram_checked_at"]) {
          if (!empty(keeper[f]) || empty(src[f])) continue
          writes.push({ part: "B", table: "shops", id: keeper.id, field: f, old: keeper[f] ?? null, value: src[f] })
          keeper[f] = src[f]
          filled.push(f)
        }
      }
    }
    partBFieldsFilled += filled.length

    // Artists and shop_artists stubs.
    const atKeeper = new Map(activeArtistsAt(keeper.id).map((a) => [normalizeArtistName(a.display_name), a]))
    const stubNames = new Set(stubs.filter((r) => r.shop_id === keeper.id).map((r) => normalizeArtistName(r.name)))
    let moved = 0
    let hidden = 0
    for (const d of dupes) {
      for (const a of activeArtistsAt(d.shop.id)) {
        const n = normalizeArtistName(a.display_name)
        const twin = n ? atKeeper.get(n) : undefined
        if (twin && !claimed(a)) {
          fillArtist("B", twin, a)
          hideArtist("B", a)
          hidden++
          continue
        }
        if (twin) problems.push(`Part B: ${a.display_name} (claimed) moved to ${keeper.name} next to an unclaimed profile with the same name.`)
        writes.push({ part: "B", table: "artists", id: a.id, field: "shop_id", old: d.shop.id, value: keeper.id })
        artistShop.set(a.id, keeper.id)
        if (n && !twin) atKeeper.set(n, a)
        moved++
      }
      for (const r of stubs.filter((x) => x.shop_id === d.shop.id)) {
        const n = normalizeArtistName(r.name)
        if (stubNames.has(n)) continue
        stubNames.add(n)
        writes.push({ part: "B", table: "shop_artists", id: r.id, field: "shop_id", old: d.shop.id, value: keeper.id })
        r.shop_id = keeper.id
        partBStubsMoved++
      }
      hiddenShops.add(d.shop.id)
      writes.push({ part: "B", table: "shops", id: d.shop.id, field: "is_active", old: true, value: false })
      const kp = normalizePhone(keeper.phone)
      const dp = normalizePhone(d.shop.phone)
      const conflict = kp && dp && kp !== dp
      if (conflict) phoneConflicts++
      merges.push({
        keeper: keeper.name,
        keeper_id: keeper.id,
        keeper_reviews: keeper.review_count ?? 0,
        duplicate: d.shop.name,
        duplicate_id: d.shop.id,
        duplicate_reviews: d.shop.review_count ?? 0,
        city: place(keeper),
        distance_m: d.meters == null ? "" : Math.round(d.meters),
        matched_by: d.how,
        keeper_address: keeper.address ?? "",
        duplicate_address: d.shop.address ?? "",
        phone_conflict: conflict ? `${keeper.phone} vs ${d.shop.phone}` : "",
        fields_filled: "",
      })
    }
    merges[merges.length - 1].fields_filled = filled.join(" ")
    partBMoved += moved
    partBArtistsHidden += hidden
  }

  // ── C ────────────────────────────────────────────────────────────────────
  const nameChanges: Row[] = []
  const nameReview: Row[] = []
  let namesHidden = 0
  for (const a of artists) {
    if (hiddenArtists.has(a.id) || claimed(a)) continue
    const shop = shopById.get(artistShop.get(a.id)!)
    const cities = Array.from(new Set([a.city, shop?.city].filter(Boolean).map((c: string) => c.toLowerCase().trim())))
    const d = decideName(String(a.display_name ?? ""), cities)
    const base = { artist_id: a.id, shop: shop?.name ?? "", city: shop ? place(shop) : place(a) }
    if (d.kind === "hide") {
      hideArtist("C", a)
      namesHidden++
      nameChanges.push({ ...base, action: "hide", before: a.display_name, after: "", why: d.why })
    } else if (d.kind === "rename") {
      writes.push({ part: "C", table: "artists", id: a.id, field: "display_name", old: a.display_name, value: d.to })
      nameChanges.push({ ...base, action: "rename", before: a.display_name, after: d.to, why: d.why })
      const odd = oddName(d.to)
      if (odd) nameReview.push({ ...base, name: d.to, original: a.display_name, why: odd })
    } else if (d.kind === "review") {
      nameReview.push({ ...base, name: a.display_name, original: "", why: d.why })
    }
  }

  // ── D ────────────────────────────────────────────────────────────────────
  const activeCount = new Map<string, number>()
  for (const a of artists) if (!hiddenArtists.has(a.id)) activeCount.set(artistShop.get(a.id)!, (activeCount.get(artistShop.get(a.id)!) ?? 0) + 1)
  const closed: Row[] = []
  let linkHidden = 0
  for (const s of shops) {
    if (hiddenShops.has(s.id)) continue
    if (["dead", "parked", "not_found"].includes(s.website_status) && !empty(s.website)) linkHidden++
    if (s.possibly_closed || !["dead", "parked"].includes(s.website_status)) continue
    if ((s.review_count ?? 0) > 0 || !empty(s.instagram_url) || (activeCount.get(s.id) ?? 0) > 0) continue
    closed.push({ shop_id: s.id, name: s.name, city: place(s), website: s.website ?? "", website_status: s.website_status, phone: s.phone ?? "", facebook: s.facebook_url ?? "", created_at: String(s.created_at).slice(0, 10) })
    writes.push({ part: "D", table: "shops", id: s.id, field: "possibly_closed", old: false, value: true })
  }

  // ── E ────────────────────────────────────────────────────────────────────
  const withPhoto = artists.filter((a) => !hiddenArtists.has(a.id) && !empty(a.avatar_url))
  const urls = Array.from(new Set(withPhoto.map((a) => String(a.avatar_url).trim())))
  const toCheck = urls.filter((u) => !photoChecks.has(u))
  if (checkPhotos && toCheck.length) {
    console.log(`Part E: checking ${fmt(toCheck.length)} photo URLs (${fmt(urls.length - toCheck.length)} already checked)…`)
    let done = 0
    await runPool(toCheck, PHOTO_CONCURRENCY, async (u) => {
      photoChecks.set(u, await checkPhoto(u))
      if (++done % 500 === 0) {
        console.log(`  ${fmt(done)} / ${fmt(toCheck.length)}`)
        savePhotoChecks(photoChecks)
      }
    })
    savePhotoChecks(photoChecks)
  }
  const photoRows: Row[] = []
  const photoTally: Record<string, number> = {}
  for (const a of withPhoto) {
    const u = String(a.avatar_url).trim()
    const r = photoChecks.get(u)
    if (!r) continue
    const v = photoVerdict(r)
    const label = v === "other" ? `HTTP ${r.status}` : v === "unreachable" ? `no connection (${r.error})` : v === "gone" ? `HTTP ${r.status}` : "loads"
    const host = hostOf(u.startsWith("//") ? `https:${u}` : u) || "(relative path)"
    photoTally[`${v}|${host}`] = (photoTally[`${v}|${host}`] ?? 0) + 1
    if (v !== "gone" && v !== "unreachable") continue
    photoRows.push({ artist_id: a.id, name: a.display_name, host, result: label, avatar_url: u })
    writes.push({ part: "E", table: "artists", id: a.id, field: "avatar_url", old: a.avatar_url, value: null })
  }
  const uncheckedPhotos = withPhoto.filter((a) => !photoChecks.has(String(a.avatar_url).trim())).length

  const after = {
    shops: before.shops - hiddenShops.size,
    listed: before.listed - Array.from(hiddenShops).filter((id) => !shopById.get(id)!.possibly_closed).length - closed.length,
    artists: before.artists - hiddenArtists.size,
  }

  // Signed-in users' saved items and reviews on rows being hidden.
  const hiddenShopIds = Array.from(hiddenShops)
  const hiddenArtistIds = Array.from(hiddenArtists)
  const saved = [
    ...(await fetchIn<Row>(supabase, "saved_items", "id, item_type, item_id", "item_id", hiddenShopIds)),
    ...(await fetchIn<Row>(supabase, "saved_items", "id, item_type, item_id", "item_id", hiddenArtistIds)),
  ]
  if (saved.length) problems.push(`${saved.length} saved item(s) point at listings or artists being hidden (they stay saved but won't show).`)
  const shopReviews = await fetchIn<Row>(supabase, "reviews", "id, shop_id", "shop_id", hiddenShopIds).catch(() => [] as Row[])
  if (shopReviews.length) problems.push(`${shopReviews.length} site review(s) are on listings being hidden.`)
  const relative = photoRows.filter((r) => String(r.result).includes("not a full web address")).length
  if (relative) problems.push(`Part E: ${relative} of the cleared photos are relative paths copied from shop sites ("uploads/jo.jpg"), not web addresses; they can't load on our site, so they're cleared with the broken ones.`)
  const far = merges.filter((m) => m.matched_by === "same street address" && m.distance_m !== "" && Number(m.distance_m) > 1000).length
  if (far) problems.push(`Part B: ${far} duplicates matched on the same street address but are pinned more than 1 km from the keeper (one of the two map pins is off).`)
  if (phoneConflicts) problems.push(`Part B: ${phoneConflicts} merged duplicates have a different phone number from their keeper (listed in prelaunch-partB-merges.csv, merged anyway per the rule).`)

  return {
    before,
    after,
    writes,
    problems,
    candidates,
    partAArtists,
    merges,
    partB: { moved: partBMoved, hidden: partBArtistsHidden, filled: partBFieldsFilled, stubs: partBStubsMoved },
    nameChanges,
    nameReview,
    namesHidden,
    closed,
    linkHidden,
    photoRows,
    photoTally,
    photosChecked: withPhoto.length - uncheckedPhotos,
    uncheckedPhotos,
  }
}
type Plan = Awaited<ReturnType<typeof buildPlan>>

function loadPhotoChecks(): Map<string, PhotoResult> {
  try {
    return new Map(Object.entries(JSON.parse(fs.readFileSync(PHOTO_CACHE, "utf-8"))))
  } catch {
    return new Map()
  }
}
function savePhotoChecks(m: Map<string, PhotoResult>) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(PHOTO_CACHE, JSON.stringify(Object.fromEntries(m)))
}

// ── Report ───────────────────────────────────────────────────────────────────

function sample<T>(rows: T[], n: number): T[] {
  // Spread evenly through the list, so reruns pick the same rows.
  if (rows.length <= n) return rows
  return Array.from({ length: n }, (_, i) => rows[Math.floor((i * rows.length) / n)])
}
const cell = (v: unknown) => String(v ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ") || "—"
function table(headers: string[], rows: unknown[][]): string {
  return [`| ${headers.join(" | ")} |`, `|${headers.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n")
}

function report(p: Plan, undoFile: string | null, notes: string[]): string {
  const count = (part: string, table: string, field: string, value?: unknown) =>
    p.writes.filter((w) => w.part === part && w.table === table && w.field === field && (value === undefined || w.value === value)).length
  const aListings = count("A", "shops", "is_active")
  const aArtistsMerged = p.partAArtists.filter((r) => String(r.outcome).startsWith("merged")).length
  const aArtistsHidden = p.partAArtists.filter((r) => String(r.outcome).startsWith("hidden")).length
  const renames = p.nameChanges.filter((r) => r.action === "rename").length
  const photos = p.photoRows.length
  const mode = APPLY ? "APPLIED" : "DRY RUN"
  const verb = APPLY ? "" : "would "
  const out: string[] = []
  out.push(`## Step 4 report: ${mode}`, "")
  out.push(
    `**In one sentence:** This run ${verb}${APPLY ? "hid" : "hide"} ${fmt(aListings)} listings that aren't tattoo shops and ${fmt(p.merges.length)} duplicate listings, ` +
      `${APPLY ? "cleaned" : "clean"} ${fmt(renames)} artist names, ${APPLY ? "marked" : "mark"} ${fmt(p.closed.length)} shops with dead websites as possibly closed, and ${APPLY ? "cleared" : "clear"} ${fmt(photos)} broken profile photos.`,
    "",
  )
  out.push("**Numbers**")
  out.push(
    table(
      ["Part", "What", "Count"],
      [
        ["A", "Listings hidden", fmt(aListings)],
        ["A", "Artists merged into the same person at a real shop", fmt(aArtistsMerged)],
        ["A", "Artists hidden with their listing", fmt(aArtistsHidden)],
        ["B", "Duplicate listings hidden", fmt(p.merges.length)],
        ["B", "Artists moved to the keeper", fmt(p.partB.moved)],
        ["B", "Artist copies hidden (keeper already had that name)", fmt(p.partB.hidden)],
        ["B", "Keeper fields filled", fmt(p.partB.filled)],
        ["B", "Shop roster names (shop_artists) moved to the keeper", fmt(p.partB.stubs)],
        ["C", "Names cleaned", fmt(renames)],
        ["C", "Names hidden (not a name)", fmt(p.namesHidden)],
        ["C", "Names sent to review", fmt(p.nameReview.length)],
        ["D", "Shops marked possibly closed", fmt(p.closed.length)],
        ["D", "Shops whose Website link is hidden (dead, parked or not found)", fmt(p.linkHidden)],
        ["E", `Broken photos cleared (of ${fmt(p.photosChecked)} checked)`, fmt(photos)],
        ["All", "Active shops: before / after", `${fmt(p.before.shops)} / ${fmt(p.after.shops)}`],
        ["All", "Shops shown in the finder and map: before / after", `${fmt(p.before.listed)} / ${fmt(p.after.listed)}`],
        ["All", "Active artists: before / after", `${fmt(p.before.artists)} / ${fmt(p.after.artists)}`],
      ],
    ),
    "",
  )

  out.push(`**Part A candidate list** (${p.candidates.length}: ${p.candidates.filter((c) => c.group === "likely_not_a_shop").length} likely not a shop, ${p.candidates.filter((c) => c.group === "likely_real_shop").length} likely a real shop). Only the first group is hidden.`, "")
  for (const g of ["likely_not_a_shop", "likely_real_shop"]) {
    const rows = p.candidates.filter((c) => c.group === g)
    out.push(`*${g}* (${rows.length})`, "")
    out.push(table(["Name", "City", "Artists", "Website", "Reviews", "Why", "Might be a real shop"], rows.map((c) => [c.name, c.city, c.artists, c.website, c.reviews, c.reason + (c.owner ? ", claimed" : ""), c.check])), "")
  }
  if (p.partAArtists.length) {
    out.push(`*Artists at the hidden listings* (${p.partAArtists.length})`, "")
    out.push(table(["Artist", "Listing", "What happens", "Same person at", "Filled there"], p.partAArtists.map((r) => [r.artist, r.listing, r.outcome, r.other_shop, r.filled])), "")
  }

  out.push("**Spot-check**", "")
  out.push(`10 duplicate merges (of ${fmt(p.merges.length)}):`, "")
  out.push(table(["Keeper", "Duplicate", "City", "Distance", "Matched by", "Reviews (keeper / dup)"], sample(p.merges, 10).map((m) => [m.keeper, m.duplicate, m.city, m.distance_m === "" ? "no coordinates" : `${m.distance_m} m`, m.matched_by, `${m.keeper_reviews} / ${m.duplicate_reviews}`])), "")
  const renamesOnly = p.nameChanges.filter((r) => r.action === "rename")
  const tagline = renamesOnly.filter((r) => String(r.why).includes("tagline"))
  const picks = [...sample(tagline, Math.min(7, tagline.length)), ...sample(renamesOnly.filter((r) => !String(r.why).includes("tagline")), 15 - Math.min(7, tagline.length))]
  out.push(`15 name changes (of ${fmt(renamesOnly.length)}):`, "")
  out.push(table(["Before", "After", "Why"], picks.map((r) => [r.before, r.after, r.why])), "")
  const hides = p.nameChanges.filter((r) => r.action === "hide")
  if (hides.length) {
    out.push(`Names hidden (${hides.length}${hides.length > 25 ? ", first 25" : ""}):`, "")
    out.push(table(["Name", "Shop", "Why"], hides.slice(0, 25).map((r) => [r.before, r.shop, r.why])), "")
  }
  out.push(`15 possibly-closed examples (of ${fmt(p.closed.length)}):`, "")
  out.push(table(["Shop", "City", "Website", "Status"], sample(p.closed, 15).map((c) => [c.name, c.city, c.website, c.website_status])), "")
  if (p.photoRows.length) {
    const byResult: Record<string, number> = {}
    for (const r of p.photoRows) byResult[`${r.host}: ${String(r.result).replace(/\(.*\)/, "").trim()}`] = (byResult[`${r.host}: ${String(r.result).replace(/\(.*\)/, "").trim()}`] ?? 0) + 1
    out.push(`Broken photos by host: ${Object.entries(byResult).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${fmt(v)}`).join("; ")}.`, "")
  }

  out.push("**Problems or surprises:**")
  const all = [...p.problems, ...notes]
  out.push(all.length ? all.map((x) => `- ${x}`).join("\n") : "None", "")

  out.push("**Undo:**")
  if (undoFile) out.push(`\`npx tsx scripts/cleanup/undo-prelaunch.ts --input ${path.relative(process.cwd(), undoFile)}\` (dry run first, then --apply). Back up the log: copy data/undo/ to Documents and iCloud.`, "")
  else out.push("Nothing written yet. An applied run writes its undo log to data/undo/prelaunch-cleanup-<time>.jsonl.", "")

  out.push(
    "Files: " +
      [CANDIDATES_CSV, PART_A_ARTISTS_CSV, MERGES_CSV, NAME_CHANGES_CSV, NAMES_REVIEW_CSV, CLOSED_CSV, PHOTOS_CSV].map((f) => `\`${path.relative(process.cwd(), f)}\``).join(", ") +
      ".",
    "",
  )
  out.push(`**Next:** ${APPLY ? "back up the undo log, spot-check a few shop pages, then go to Step 5." : 'review the Part A list and the samples, then say "apply".'}`)
  return out.join("\n") + "\n"
}

function writeCsvs(p: Plan) {
  writeCsv(CANDIDATES_CSV, ["group", "reason", "check", "name", "city", "artists", "website", "reviews", "owner", "shop_id"], p.candidates)
  writeCsv(PART_A_ARTISTS_CSV, ["artist", "listing", "listing_city", "instagram", "outcome", "other_shop", "filled", "artist_id"], p.partAArtists)
  writeCsv(MERGES_CSV, ["keeper", "duplicate", "city", "distance_m", "matched_by", "keeper_reviews", "duplicate_reviews", "keeper_address", "duplicate_address", "phone_conflict", "fields_filled", "keeper_id", "duplicate_id"], p.merges)
  writeCsv(NAME_CHANGES_CSV, ["action", "before", "after", "why", "shop", "city", "artist_id"], p.nameChanges)
  writeCsv(NAMES_REVIEW_CSV, ["name", "why", "original", "shop", "city", "artist_id"], p.nameReview)
  writeCsv(CLOSED_CSV, ["name", "city", "website", "website_status", "phone", "facebook", "created_at", "shop_id"], p.closed)
  writeCsv(PHOTOS_CSV, ["name", "host", "result", "avatar_url", "artist_id"], p.photoRows)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  modeBanner(APPLY)
  const supabase = getSupabaseAdmin()
  const photoChecks = loadPhotoChecks()
  const notes: string[] = []

  if (!APPLY) {
    const plan = await buildPlan(supabase, photoChecks, true)
    fs.mkdirSync(REPORT_DIR, { recursive: true })
    fs.writeFileSync(PLAN_FILE, JSON.stringify({ created_at: new Date().toISOString(), writes: plan.writes }, null, 1))
    writeCsvs(plan)
    fs.writeFileSync(REPORT_FILE, report(plan, null, notes))
    console.log(`\nPlan: ${plan.writes.length} field writes. Report: ${path.relative(process.cwd(), REPORT_FILE)}`)
    return
  }

  if (!fs.existsSync(PLAN_FILE)) throw new Error("No dry run plan. Run without --apply first.")
  const dry = JSON.parse(fs.readFileSync(PLAN_FILE, "utf-8")) as { writes: Write[] }
  // Photos aren't re-checked here; the dry run's broken list is re-checked below.
  const plan = await buildPlan(supabase, photoChecks, false)
  const keysNow = new Set(plan.writes.filter((w) => w.part !== "E").map(writeKey))
  const keysDry = new Set(dry.writes.filter((w) => w.part !== "E").map(writeKey))
  const missing = Array.from(keysDry).filter((k) => !keysNow.has(k))
  const extra = Array.from(keysNow).filter((k) => !keysDry.has(k))
  if (missing.length || extra.length) {
    console.error(`Parts A–D differ from the dry run: ${missing.length} planned writes gone, ${extra.length} new. Run the dry run again.`)
    for (const k of [...missing.slice(0, 10).map((k) => `- ${k}`), ...extra.slice(0, 10).map((k) => `+ ${k}`)]) console.error(`  ${k}`)
    process.exit(1)
  }

  // Part E: only photos the dry run found broken, each checked once more now.
  const dryPhotos = new Set(dry.writes.filter((w) => w.part === "E").map((w) => w.id))
  const photoWrites = plan.writes.filter((w) => w.part === "E" && dryPhotos.has(w.id))
  const recovered = new Set<string>()
  console.log(`Re-checking ${photoWrites.length} broken photos…`)
  await runPool(photoWrites, PHOTO_CONCURRENCY, async (w) => {
    const r = await checkPhoto(String(w.old))
    const v = photoVerdict(r)
    if (v !== "gone" && v !== "unreachable") recovered.add(w.id)
  })
  if (recovered.size) notes.push(`Part E: ${recovered.size} photos that failed in the dry run loaded on the re-check, so they were kept.`)
  plan.writes = [...plan.writes.filter((w) => w.part !== "E"), ...photoWrites.filter((w) => !recovered.has(w.id))]
  plan.photoRows = plan.photoRows.filter((r) => !recovered.has(String(r.artist_id)))

  // Write in part order; one undo line per field, appended before the write.
  const undo = new UndoLog(SCRIPT)
  let done = 0
  for (const part of ["A", "B", "C", "D", "E"] as const) {
    const ws = plan.writes.filter((w) => w.part === part)
    // One update per row, with all of that row's fields from this part.
    const rows = new Map<string, Write[]>()
    for (const w of ws) rows.set(`${w.table}|${w.id}`, [...(rows.get(`${w.table}|${w.id}`) ?? []), w])
    console.log(`Part ${part}: ${ws.length} field writes on ${rows.size} rows`)
    await runPool(Array.from(rows.values()), 10, async (group) => {
      const { table, id } = group[0]
      undo.append(group.map((w) => ({ table, id, field: w.field, old_value: w.old ?? null, new_value: w.value })))
      const patch = Object.fromEntries(group.map((w) => [w.field, w.value]))
      await withRetry(`update ${table} ${id}`, async () => {
        const { error } = await supabase.from(table).update(patch).eq("id", id)
        if (error) throw new Error(error.message)
      })
      if (++done % 500 === 0) console.log(`  ${fmt(done)} rows written`)
    })
  }

  writeCsvs(plan)
  fs.writeFileSync(REPORT_FILE, report(plan, undo.file, notes))
  console.log(`\nApplied ${plan.writes.length} field writes. Undo log: ${path.relative(process.cwd(), undo.file)}`)
  console.log(`Report: ${path.relative(process.cwd(), REPORT_FILE)}`)
}

if (process.argv[1]?.endsWith("prelaunch.ts")) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
