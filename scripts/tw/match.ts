// scripts/tw/match.ts — research only. READS the database, never writes to it.
// Matches data/tw/profiles.jsonl against our active artists and shops and writes
//   data/reports/tattooswizard-profiles.csv   one row per profile, by followers
//   data/reports/tattooswizard-summary.md
// Matching keys, in order (the one that hit is recorded in match_key):
//   a. Instagram handle — artists.instagram_handle, and the handle inside
//      shops.instagram_url (or an instagram.com URL stored in shops.website)
//   b. phone → shops.phone          c. website domain → shops.website
//   d. exact normalized name + same city + same state
//   e. PROBABLE (review only): studio name ≥ 0.9 token similarity + same city
// Same name in another city/state is never a match (match_note name_match_elsewhere).
// Run: npx tsx scripts/tw/match.ts [--input data/tw/profiles.jsonl]

import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"
import { getSupabaseAdmin } from "../lib/supabase-admin"
import { fetchAll, similarity, writeCsv } from "../lib/cleanup-utils"
import { PROFILES_FILE, REPORT_DIR, TW_DIR, option, readJson, readJsonl } from "./lib/common"
import { fillRates } from "./lib/fill"
import { instagramHandle, type Profile } from "./lib/parse"
import { fmtDuration } from "./lib/fetcher"

const INPUT = path.resolve(option("--input") ?? PROFILES_FILE)
const PROBABLE_MIN = 0.9

type Status =
  | "artist_existing"
  | "artist_new_shop_known"
  | "artist_new_shop_probable"
  | "artist_new_shop_missing"
  | "artist_new_private"
  | "studio_existing"
  | "studio_new"
  | "not_us_based"
  | "unparseable"

const STATUSES: Status[] = [
  "artist_existing",
  "artist_new_shop_known",
  "artist_new_shop_probable",
  "artist_new_shop_missing",
  "artist_new_private",
  "studio_existing",
  "studio_new",
  "not_us_based",
  "unparseable",
]

interface DbArtist {
  id: string
  display_name: string | null
  handle: string | null
  instagram_handle: string | null
  styles: string[] | null
  shop_id: string | null
  city: string | null
  state: string | null
}
interface DbShop {
  id: string
  name: string | null
  city: string | null
  state: string | null
  phone: string | null
  website: string | null
  instagram_url: string | null
  latitude: number | null
  longitude: number | null
}

// ---- normalization ----------------------------------------------------------

const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "")

/** lowercase, no accents, punctuation → space, collapsed. */
export function normName(raw: unknown): string {
  return stripAccents(String(raw ?? ""))
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}
/** Exact-match key: normName without spaces ("Ink & Iron" = "ink&iron"). */
const nameKey = (raw: unknown) => normName(raw).replace(/ /g, "")

export function normCity(raw: unknown): string {
  return normName(String(raw ?? "").replace(/^\s*city of\s+/i, ""))
    .replace(/^st\b/, "saint")
    .replace(/\bst\b(?= )/g, "saint")
    .trim()
}
const normState = (raw: unknown) => String(raw ?? "").trim().toUpperCase()
const placeKey = (city: unknown, state: unknown) => `${normCity(city)}|${normState(state)}`

const normPhone = (raw: unknown): string | null => {
  let d = String(raw ?? "").replace(/\D/g, "")
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1)
  return d.length === 10 ? d : null
}

// Link-in-bio, social and booking platforms: one domain is shared by many
// businesses, so a domain match there means nothing.
const SHARED_DOMAINS = new Set([
  "linktr.ee", "beacons.ai", "instagram.com", "facebook.com", "fb.com", "m.facebook.com",
  "linkpop.com", "linkin.bio", "lnk.bio", "tap.bio", "campsite.bio", "bio.link", "solo.to", "msha.ke", "later.com",
  "youtube.com", "youtu.be", "tiktok.com", "twitter.com", "x.com", "threads.net", "pinterest.com",
  "booksy.com", "vagaro.com", "squareup.com", "square.site", "fresha.com", "styleseat.com", "schedulicity.com",
  "tattoodo.com", "tattooswizard.com", "yelp.com", "google.com", "goo.gl", "g.page", "maps.app.goo.gl", "bit.ly",
  "carrd.co", "wixsite.com", "squarespace.com", "godaddysites.com", "wordpress.com", "blogspot.com", "etsy.com",
])

export function normDomain(raw: unknown): string | null {
  const s = String(raw ?? "").trim()
  if (!s) return null
  let host: string
  try {
    host = new URL(/^https?:\/\//i.test(s) ? s : `http://${s}`).hostname.toLowerCase()
  } catch {
    return null
  }
  host = host.replace(/^www\d?\./, "").replace(/\.$/, "")
  if (!host.includes(".") || SHARED_DOMAINS.has(host)) return null
  return host
}

// Junk seen in artists.instagram_handle ("Instagram", "www.instagram.com", …).
const JUNK_HANDLES = new Set(["instagram", "instagram.com", "www.instagram.com", "ig", "insta", "none", "n/a", "na", "null", "facebook", "tiktok"])
function dbHandle(raw: unknown): string | null {
  const s = String(raw ?? "").trim()
  if (!s || JUNK_HANDLES.has(s.toLowerCase())) return null
  const h = instagramHandle(s)
  return h && !JUNK_HANDLES.has(h) && h.length >= 2 ? h : null
}

const GENERIC_TOKENS = new Set([
  "tattoo", "tattoos", "tattooing", "studio", "studios", "shop", "co", "company", "parlor", "parlour", "ink",
  "the", "and", "art", "arts", "gallery", "collective", "body", "piercing", "llc", "inc", "house", "lounge",
])

// Token similarity for studio names: generic words ("tattoo", "studio", "co" …)
// are dropped, the rest sorted and compared, so "Bang Bang Tattoo" = "Bang Bang
// Tattoos" but "Bar Bar" ≠ "FIB Tattoo Bar and Grill".
export function tokenSimilarity(a: string, b: string): number {
  const toks = (s: string) => {
    const all = normName(s).split(" ").filter(Boolean)
    const distinct = all.filter((t) => !GENERIC_TOKENS.has(t.replace(/s$/, "")) && !GENERIC_TOKENS.has(t))
    return (distinct.length ? distinct : all).sort().join(" ")
  }
  const ta = toks(a)
  const tb = toks(b)
  if (!ta || !tb) return 0
  return similarity(ta, tb)
}

// ---- indexes ----------------------------------------------------------------

function multiMap<T>(items: T[], key: (t: T) => (string | null)[]): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const it of items)
    for (const k of key(it)) {
      if (!k) continue
      const arr = m.get(k)
      if (arr) arr.push(it)
      else m.set(k, [it])
    }
  return m
}

/** Prefer candidates in the same city, then the same state; report how many tied. */
function pick<T extends { city: string | null; state: string | null }>(cands: T[] | undefined, city: string | null, state: string | null): { hit: T; tied: number } | null {
  if (!cands?.length) return null
  const sameCity = cands.filter((c) => placeKey(c.city, c.state) === placeKey(city, state))
  const sameState = cands.filter((c) => normState(c.state) === normState(state))
  const best = sameCity.length ? sameCity : sameState.length ? sameState : cands
  return { hit: best[0], tied: best.length }
}

// ---- matching ---------------------------------------------------------------

interface Result {
  p: Profile
  status: Status
  match_key: string | null
  match_note: string[]
  artist: DbArtist | null
  shop: DbShop | null
  probable_score: number | null
  fields_to_add: string[]
  roster_listed: string[]
  roster_derived: string[]
  roster_missing: string[]
  shop_active_artists: number | null
}

const fmtStyles = (p: Profile) => p.style_tags.map((t) => (t.count === null ? t.style : `${t.style}:${t.count}`)).join("; ")

async function main() {
  const t0 = Date.now()
  if (!fs.existsSync(INPUT)) {
    console.error(`No profiles at ${INPUT}. Run scripts/tw/fetch.ts first.`)
    process.exit(1)
  }
  const profiles = readJsonl<Profile>(INPUT)
  console.log(`Profiles: ${profiles.length} from ${INPUT}`)

  // Load once, read-only.
  const supabase = getSupabaseAdmin()
  const artists = await fetchAll<DbArtist>(supabase, "artists", "id, display_name, handle, instagram_handle, styles, shop_id, city, state", (q) => q.eq("is_active", true))
  const shops = await fetchAll<DbShop>(supabase, "shops", "id, name, city, state, phone, website, instagram_url, latitude, longitude", (q) => q.eq("is_active", true))
  console.log(`DB (read-only): ${artists.length} active artists, ${shops.length} active shops\n`)

  const shopById = new Map(shops.map((s) => [s.id, s]))
  const artistsPerShop = new Map<string, number>()
  for (const a of artists) if (a.shop_id) artistsPerShop.set(a.shop_id, (artistsPerShop.get(a.shop_id) ?? 0) + 1)
  // An artist's place: their own city/state, else their shop's.
  const artistPlace = (a: DbArtist) => {
    const s = a.shop_id ? shopById.get(a.shop_id) : undefined
    return { city: a.city || s?.city || null, state: a.state || s?.state || null }
  }
  const artistsWithPlace = artists.map((a) => ({ ...a, ...artistPlace(a), _a: a }))

  const artistByHandle = multiMap(artistsWithPlace, (a) => [dbHandle(a.instagram_handle)])
  const artistByName = multiMap(artistsWithPlace, (a) => [nameKey(a.display_name)])
  const shopIgHandle = (s: DbShop): { handle: string | null; source: string } => {
    const fromUrl = instagramHandle(s.instagram_url)
    if (fromUrl) return { handle: fromUrl, source: "instagram_url" }
    return { handle: /instagram\.com\//i.test(s.website ?? "") ? instagramHandle(s.website) : null, source: "website" }
  }
  const shopByHandle = multiMap(shops, (s) => [shopIgHandle(s).handle])
  const shopByPhone = multiMap(shops, (s) => [normPhone(s.phone)])
  const shopByDomain = multiMap(shops, (s) => [normDomain(s.website)])
  const shopByName = multiMap(shops, (s) => [nameKey(s.name)])
  const shopsByPlace = multiMap(shops, (s) => [placeKey(s.city, s.state)])

  const igKey = (s: DbShop) => (shopIgHandle(s).source === "website" ? "instagram (shop website field)" : "instagram")

  // Shop lookup with keys a–d (and e as probable). Used for studio profiles
  // and for an artist's studio.
  type ShopHit = { shop: DbShop; key: string; probable: number | null; note?: string }
  const findShop = (q: { handle: string | null; phone: string | null; website: string | null; name: string | null; city: string | null; state: string | null }, prefix = ""): ShopHit | null => {
    const tie = (n: number) => (n > 1 ? `${prefix}ambiguous (${n} candidates)` : undefined)
    let r = q.handle ? pick(shopByHandle.get(q.handle), q.city, q.state) : null
    if (r) return { shop: r.hit, key: prefix + igKey(r.hit), probable: null, note: tie(r.tied) }
    r = normPhone(q.phone) ? pick(shopByPhone.get(normPhone(q.phone)!), q.city, q.state) : null
    if (r) return { shop: r.hit, key: prefix + "phone", probable: null, note: tie(r.tied) }
    const d = normDomain(q.website)
    r = d ? pick(shopByDomain.get(d), q.city, q.state) : null
    if (r) return { shop: r.hit, key: prefix + "website", probable: null, note: tie(r.tied) }
    if (q.name && q.city && q.state) {
      const same = (shopByName.get(nameKey(q.name)) ?? []).filter((s) => placeKey(s.city, s.state) === placeKey(q.city, q.state))
      if (same.length) return { shop: same[0], key: prefix + "name_city_state", probable: null, note: tie(same.length) }
    }
    return null
  }
  const probableShop = (name: string | null, city: string | null, state: string | null): { shop: DbShop; score: number } | null => {
    if (!name || !city) return null
    let best: { shop: DbShop; score: number } | null = null
    for (const s of shopsByPlace.get(placeKey(city, state)) ?? []) {
      if (!s.name) continue
      const score = tokenSimilarity(name, s.name)
      if (score >= PROBABLE_MIN && (!best || score > best.score)) best = { shop: s, score }
    }
    return best
  }

  // TW studio profiles by username / IG handle / name+city, to resolve an
  // artist's studio through the site's own studio page.
  const twStudios = profiles.filter((p) => p.is_studio === true && !p.parse_error)
  const twStudioByHandle = new Map<string, Profile>()
  for (const s of twStudios) {
    twStudioByHandle.set(s.username, s)
    if (s.instagram_handle) twStudioByHandle.set(s.instagram_handle, s)
  }
  const twStudioByNamePlace = new Map(twStudios.map((s) => [`${nameKey(s.name)}|${placeKey(s.city, s.state)}`, s]))

  const results = new Map<string, Result>()
  const resultOf = (p: Profile, status: Status, extra: Partial<Result> = {}): Result => ({
    p,
    status,
    match_key: null,
    match_note: [],
    artist: null,
    shop: null,
    probable_score: null,
    fields_to_add: [],
    roster_listed: [],
    roster_derived: [],
    roster_missing: [],
    shop_active_artists: null,
    ...extra,
  })

  // Pass 1: studios (artists may resolve their studio through these).
  for (const p of profiles) {
    if (p.parse_error || !p.name) {
      results.set(p.url, resultOf(p, "unparseable", { match_note: [p.parse_error ?? "no name"] }))
      continue
    }
    if (p.country !== "US") {
      results.set(p.url, resultOf(p, "not_us_based", { match_note: [`country ${p.country ?? "unknown"}`] }))
      continue
    }
    if (!p.city || !p.state) {
      results.set(p.url, resultOf(p, "unparseable", { match_note: ["no US city/state"] }))
      continue
    }
    if (p.is_studio !== true) continue
    const hit = findShop({ handle: p.instagram_handle, phone: p.phone, website: p.website, name: p.name, city: p.city, state: p.state })
    if (hit) {
      const add: string[] = []
      const s = hit.shop
      if (p.instagram_handle && !instagramHandle(s.instagram_url)) add.push("instagram_url")
      if (p.phone && !normPhone(s.phone)) add.push("phone")
      if (p.website && normDomain(p.website) && !String(s.website ?? "").trim()) add.push("website")
      results.set(p.url, resultOf(p, "studio_existing", { shop: s, match_key: hit.key, match_note: hit.note ? [hit.note] : [], fields_to_add: add, shop_active_artists: artistsPerShop.get(s.id) ?? 0 }))
    } else {
      const prob = probableShop(p.name, p.city, p.state)
      const r = resultOf(p, "studio_new")
      if (prob) Object.assign(r, { shop: prob.shop, match_key: "probable_studio_name", probable_score: prob.score, match_note: ["probable shop match — review only"] })
      if ((shopByName.get(nameKey(p.name)) ?? []).length) r.match_note.push("name_match_elsewhere")
      results.set(p.url, r)
    }
  }

  // Pass 2: artists.
  for (const p of profiles) {
    if (results.has(p.url)) continue
    const note: string[] = []
    if (p.guest_or_traveling) {
      results.set(p.url, resultOf(p, "not_us_based", { match_note: ["bio says guest spots / traveling only"] }))
      continue
    }
    const fieldsToAdd = (a: DbArtist) => {
      const add: string[] = []
      if (p.instagram_handle && !dbHandle(a.instagram_handle)) add.push(a.instagram_handle ? "handle (ours is junk)" : "handle")
      if (p.instagram_followers !== null) add.push("followers")
      if (p.style_slugs.length && !(a.styles ?? []).length) add.push("styles")
      return add
    }
    // a. Instagram handle → artist
    const byHandle = p.instagram_handle ? pick(artistByHandle.get(p.instagram_handle), p.city, p.state) : null
    if (byHandle) {
      const a = byHandle.hit._a
      if (byHandle.tied > 1) note.push(`ambiguous (${byHandle.tied} candidates)`)
      results.set(p.url, resultOf(p, "artist_existing", { artist: a, shop: a.shop_id ? shopById.get(a.shop_id) ?? null : null, match_key: "instagram", match_note: note, fields_to_add: fieldsToAdd(a) }))
      continue
    }
    // d. exact name + same city + same state → artist
    const sameName = artistByName.get(nameKey(p.name)) ?? []
    const local = sameName.filter((a) => placeKey(a.city, a.state) === placeKey(p.city, p.state))
    if (local.length) {
      const a = local[0]._a
      if (local.length > 1) note.push(`ambiguous (${local.length} candidates)`)
      results.set(p.url, resultOf(p, "artist_existing", { artist: a, shop: a.shop_id ? shopById.get(a.shop_id) ?? null : null, match_key: "name_city_state", match_note: note, fields_to_add: fieldsToAdd(a) }))
      continue
    }
    if (sameName.length) note.push("name_match_elsewhere")

    // Not in our artists. Find their shop: own handle/phone/website against
    // shops (solo artists who are the shop), then their studio.
    let shopHit: ShopHit | null = findShop({ handle: p.instagram_handle, phone: p.phone, website: p.website, name: null, city: p.city, state: p.state }, "own ")
    let studioProfile: Profile | undefined
    if (!shopHit && (p.studio_handle || p.studio_name)) {
      studioProfile =
        (p.studio_handle ? twStudioByHandle.get(p.studio_handle) : undefined) ??
        (p.studio_name ? twStudioByNamePlace.get(`${nameKey(p.studio_name)}|${placeKey(p.city, p.state)}`) : undefined)
      const viaTw = studioProfile ? results.get(studioProfile.url) : undefined
      if (viaTw?.status === "studio_existing" && viaTw.shop) shopHit = { shop: viaTw.shop, key: `studio via TW page (${viaTw.match_key})`, probable: null }
      shopHit ??= findShop({ handle: p.studio_handle, phone: null, website: null, name: p.studio_name, city: p.city, state: p.state }, "studio ")
    }
    if (shopHit) {
      if (shopHit.note) note.push(shopHit.note)
      results.set(p.url, resultOf(p, "artist_new_shop_known", { shop: shopHit.shop, match_key: shopHit.key, match_note: note, shop_active_artists: artistsPerShop.get(shopHit.shop.id) ?? 0 }))
      continue
    }
    const prob = probableShop(p.studio_name ?? studioProfile?.name ?? null, p.city, p.state)
    if (prob) {
      note.push("probable shop match — review only")
      results.set(p.url, resultOf(p, "artist_new_shop_probable", { shop: prob.shop, match_key: "probable_studio_name", probable_score: prob.score, match_note: note }))
      continue
    }
    if (p.studio_name || p.studio_handle) results.set(p.url, resultOf(p, "artist_new_shop_missing", { match_note: note }))
    else results.set(p.url, resultOf(p, "artist_new_private", { match_note: note }))
  }

  // Rosters: listed on the studio page, plus artists whose studio resolves to it.
  const twArtistResult = (u: string) => results.get(u)
  for (const r of results.values()) {
    if (r.p.is_studio !== true || r.status === "unparseable") continue
    r.roster_listed = r.p.roster_urls
    const studio = r.p
    const derived = profiles.filter(
      (a) =>
        a.is_studio !== true &&
        !a.parse_error &&
        ((a.studio_handle && (a.studio_handle === studio.username || a.studio_handle === studio.instagram_handle)) ||
          (a.studio_name && nameKey(a.studio_name) === nameKey(studio.name) && placeKey(a.city, a.state) === placeKey(studio.city, studio.state)))
    )
    r.roster_derived = derived.map((a) => a.url).filter((u) => !r.roster_listed.includes(u))
    r.roster_missing = [...r.roster_listed, ...r.roster_derived].filter((u) => twArtistResult(u)?.status !== "artist_existing")
  }

  // ---- outputs --------------------------------------------------------------
  const all = Array.from(results.values()).sort((a, b) => (b.p.instagram_followers ?? -1) - (a.p.instagram_followers ?? -1))
  const headers = [
    "followers", "name", "profile_url", "username", "is_studio", "status", "match_key", "match_note", "probable_score",
    "matched_artist_id", "matched_artist_name", "matched_shop_id", "matched_shop_name", "matched_shop_city", "shop_active_artists",
    "fields_to_add", "instagram_handle", "followers_checked_at", "city", "state", "country", "main_style", "style_slugs",
    "unmapped_styles", "style_tags", "website", "phone", "studio_name", "studio_handle", "studio_confidence",
    "roster_listed", "roster_derived", "roster_missing_in_db", "parse_methods", "parse_error",
  ]
  const csvRows = all.map((r) => ({
    followers: r.p.instagram_followers,
    name: r.p.name,
    profile_url: r.p.url,
    username: r.p.username,
    is_studio: r.p.is_studio,
    status: r.status,
    match_key: r.match_key,
    match_note: r.match_note.join("; "),
    probable_score: r.probable_score?.toFixed(3),
    matched_artist_id: r.artist?.id,
    matched_artist_name: r.artist?.display_name,
    matched_shop_id: r.shop?.id,
    matched_shop_name: r.shop?.name,
    matched_shop_city: r.shop ? `${r.shop.city ?? ""}, ${r.shop.state ?? ""}` : null,
    shop_active_artists: r.shop_active_artists ?? (r.shop ? artistsPerShop.get(r.shop.id) ?? 0 : null),
    fields_to_add: r.fields_to_add.join("; "),
    instagram_handle: r.p.instagram_handle,
    followers_checked_at: r.p.followers_checked_at,
    city: r.p.city,
    state: r.p.state,
    country: r.p.country,
    main_style: r.p.main_style,
    style_slugs: r.p.style_slugs.join("; "),
    unmapped_styles: r.p.unmapped_styles.join("; "),
    style_tags: fmtStyles(r.p),
    website: r.p.website,
    phone: r.p.phone,
    studio_name: r.p.studio_name,
    studio_handle: r.p.studio_handle,
    studio_confidence: r.p.studio_confidence,
    roster_listed: r.roster_listed.length || null,
    roster_derived: r.roster_derived.length || null,
    roster_missing_in_db: r.roster_missing.length || null,
    parse_methods: Object.entries(r.p.methods).map(([k, v]) => `${k}=${v}`).join("; "),
    parse_error: r.p.parse_error,
  }))
  const csvPath = writeCsv(path.join(REPORT_DIR, "tattooswizard-profiles.csv"), headers, csvRows)

  // Summary
  const sampleRun = INPUT.includes(".sample.")
  const disc = readJson<Record<string, unknown>>(path.join(TW_DIR, "discover-stats.json"), {})
  const fetchStats = readJson<Record<string, unknown>>(path.join(TW_DIR, sampleRun ? "fetch-stats.sample.json" : "fetch-stats.json"), {})
  const n = (x: unknown) => (typeof x === "number" ? x.toLocaleString("en-US") : String(x ?? "?"))
  const tiers = [0, 50_000, 100_000, 250_000]
  const countBy = (min: number) => {
    const c: Record<string, number> = {}
    for (const r of all) if ((r.p.instagram_followers ?? 0) >= min) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }
  const tierCounts = tiers.map(countBy)
  const existing = all.filter((r) => r.status === "artist_existing")
  const gainHandle = existing.filter((r) => r.fields_to_add.some((f) => f.startsWith("handle")))
  const gainJunkHandle = existing.filter((r) => r.fields_to_add.includes("handle (ours is junk)"))
  const gainFollowers = existing.filter((r) => r.fields_to_add.includes("followers"))
  const gainStyles = existing.filter((r) => r.fields_to_add.includes("styles"))
  const studiosExisting = all.filter((r) => r.status === "studio_existing")
  const shopsGainIg = studiosExisting.filter((r) => r.fields_to_add.includes("instagram_url"))
  const shopsGainPhone = studiosExisting.filter((r) => r.fields_to_add.includes("phone"))
  const shopsGainWebsite = studiosExisting.filter((r) => r.fields_to_add.includes("website"))
  const emptyShops = studiosExisting.filter((r) => (r.shop_active_artists ?? 0) === 0)
  const emptyShopsWithRoster = emptyShops.filter((r) => r.roster_listed.length + r.roster_derived.length > 0)
  const newWithKnownShop = all.filter((r) => r.status === "artist_new_shop_known")
  const newIntoEmptyShop = newWithKnownShop.filter((r) => (r.shop_active_artists ?? 0) === 0)
  const emptyShopIdsGainingNewArtists = new Set(newIntoEmptyShop.map((r) => r.shop!.id))

  // Seeded "random" picks so reruns show the same rows.
  const seeded = <T,>(items: T[], k: number) => {
    const out = [...items]
    let s = 7
    for (let i = out.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) % 2 ** 31
      const j = s % (i + 1)
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out.slice(0, k)
  }
  const fmtF = (f: number | null) => (f === null ? "—" : f >= 1e6 ? `${(f / 1e6).toFixed(1)}M` : f >= 1e3 ? `${(f / 1e3).toFixed(1)}K` : String(f))
  const cell = (s: unknown) => String(s ?? "—").replace(/\|/g, "\\|")
  const fr = fillRates(all.filter((r) => !r.p.parse_error?.startsWith("fetch failed")).map((r) => r.p))
  const methodCounts: Record<string, Record<string, number>> = {}
  for (const r of all) for (const [f, m] of Object.entries(r.p.methods)) ((methodCounts[f] ??= {})[m] = (methodCounts[f][m] ?? 0) + 1)
  const unmapped: Record<string, number> = {}
  for (const r of all) for (const s of r.p.unmapped_styles) unmapped[s] = (unmapped[s] ?? 0) + 1
  const studioConf: Record<string, number> = {}
  for (const r of all) if (r.p.is_studio !== true && r.p.studio_confidence) studioConf[r.p.studio_confidence] = (studioConf[r.p.studio_confidence] ?? 0) + 1
  const keyCounts: Record<string, number> = {}
  for (const r of all) if (r.match_key) keyCounts[`${r.status} ← ${r.match_key}`] = (keyCounts[`${r.status} ← ${r.match_key}`] ?? 0) + 1

  const md: string[] = []
  md.push(`# TattoosWizard US research — summary${sampleRun ? " (TEST SAMPLE)" : ""}`)
  md.push(`\nGenerated ${new Date().toISOString()} · research only, nothing was written to the database. CSV: \`data/reports/tattooswizard-profiles.csv\`.`)
  md.push(`\n## Discovery and fetching\n`)
  md.push(`| | |\n|---|---|`)
  md.push(`| Sitemap profiles (English artist sitemap, worldwide) | ${n(disc.sitemap_profiles_worldwide)} |`)
  md.push(`| US listing (claimed / unique found) | ${n(disc.us_listing_claimed)} / ${n(disc.us_listing_unique)} on ${n(disc.us_listing_pages)} pages |`)
  md.push(`| US studio listing (claimed / unique found) | ${n(disc.us_studio_listing_claimed)} / ${n(disc.us_studio_listing_unique)} |`)
  md.push(`| Overlap: US listing ∩ sitemap | ${n(disc.overlap_sitemap_and_us_listing)} |`)
  md.push(`| US profiles the sitemap missed | ${n(disc.us_only_in_listing)} |`)
  md.push(`| **Final US total** | **${n(disc.us_total)}** |`)
  md.push(`| Profiles fetched / parsed / failed | ${n(fetchStats.profiles)} / ${n(fetchStats.parsed)} / ${n(fetchStats.failed)} |`)
  md.push(`| Run time | discover ${fmtDuration(Number(disc.run_seconds ?? NaN))}, fetch ${fmtDuration(Number(fetchStats.run_seconds_total ?? NaN))}, match ${fmtDuration((Date.now() - t0) / 1000)} |`)
  md.push(`| DB loaded (read-only) | ${n(artists.length)} active artists, ${n(shops.length)} active shops |`)

  md.push(`\n## Fill rate per field\n`)
  md.push(`| Field | Filled | % |\n|---|---:|---:|`)
  for (const r of fr) md.push(`| ${r.field} | ${n(r.filled)} / ${n(r.of)} | ${r.pct.toFixed(1)}% |`)
  md.push(`\nParse method per field: ${Object.entries(methodCounts).map(([f, m]) => `${f} (${Object.entries(m).map(([k, v]) => `${k} ${v}`).join(", ")})`).join("; ")}.`)
  md.push(`\nStudio name confidence (artists): ${Object.entries(studioConf).map(([k, v]) => `${k} ${n(v)}`).join(", ") || "none"}.`)
  md.push(`\nUnmapped style names: ${Object.entries(unmapped).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${n(v)})`).join(", ") || "none"}.`)

  md.push(`\n## Status counts\n`)
  md.push(`| Status | All | 50K+ | 100K+ | 250K+ |\n|---|---:|---:|---:|---:|`)
  for (const s of STATUSES) md.push(`| ${s} | ${tierCounts.map((c) => n(c[s] ?? 0)).join(" | ")} |`)
  md.push(`| **total** | ${tierCounts.map((c) => n(Object.values(c).reduce((a, b) => a + b, 0))).join(" | ")} |`)
  md.push(`\nMatch keys: ${Object.entries(keyCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${n(v)}`).join("; ")}.`)
  md.push(`\nName matches in a different city/state (not matched, labelled \`name_match_elsewhere\`): ${n(all.filter((r) => r.match_note.includes("name_match_elsewhere")).length)}.`)

  md.push(`\n## Enrichment (fields we'd add only where ours is empty)\n`)
  md.push(`- Existing artists matched: **${n(existing.length)}**`)
  md.push(`- …would gain an Instagram handle: **${n(gainHandle.length)}** (${n(gainJunkHandle.length)} of them replace a junk value like "Instagram")`)
  md.push(`- …would gain a follower count: **${n(gainFollowers.length)}** (we have no followers column today)`)
  md.push(`- …would gain styles (have none today): **${n(gainStyles.length)}**`)
  md.push(`- Existing shops matched: **${n(studiosExisting.length)}** — would gain an Instagram link: **${n(shopsGainIg.length)}**, phone: ${n(shopsGainPhone.length)}, website: ${n(shopsGainWebsite.length)}`)
  md.push(`- New artists whose shop we already have: ${n(newWithKnownShop.length)} (into ${n(emptyShopIdsGainingNewArtists.size)} shops that have 0 active artists today)`)

  md.push(`\n## Roster gains\n`)
  md.push(`Rosters come from two places: artists the studio page lists (\`studio_artists\`), and artists whose own page names the studio (structured studio name or handle, same city), counted separately as "derived".\n`)
  md.push(`- Studios on the site that list a roster: ${n(all.filter((r) => r.roster_listed.length).length)}; with a derived roster: ${n(all.filter((r) => r.roster_derived.length).length)}`)
  md.push(`- Existing shops with **0 active artists** today: ${n(emptyShops.length)}; of those, with a site roster: **${n(emptyShopsWithRoster.length)}** (${n(emptyShopsWithRoster.reduce((a, r) => a + r.roster_listed.length + r.roster_derived.length, 0))} roster artists)`)
  md.push(`\nTop 20 by followers:\n`)
  md.push(`| Studio | Followers | City | Our shop | Listed | Derived |\n|---|---:|---|---|---:|---:|`)
  for (const r of emptyShopsWithRoster.slice(0, 20)) md.push(`| ${cell(r.p.name)} | ${fmtF(r.p.instagram_followers)} | ${cell(r.p.city)}, ${r.p.state} | ${cell(r.shop?.name)} | ${r.roster_listed.length} | ${r.roster_derived.length} |`)

  md.push(`\n## Top 30 by followers\n`)
  md.push(`| # | Name | Followers | City | Status | Match key |\n|---:|---|---:|---|---|---|`)
  all.slice(0, 30).forEach((r, i) => md.push(`| ${i + 1} | ${cell(r.p.name)} | ${fmtF(r.p.instagram_followers)} | ${cell(r.p.city)}${r.p.state ? `, ${r.p.state}` : ""} | ${r.status} | ${cell(r.match_key)} |`))

  md.push(`\n## Spot-check: 20 random artist_existing matches\n`)
  md.push(`| TW profile | TW city | Our artist | Our city | Key | Would add |\n|---|---|---|---|---|---|`)
  for (const r of seeded(existing, 20)) {
    const place = artistPlace(r.artist!)
    md.push(`| [${cell(r.p.name)}](${r.p.url}) @${cell(r.p.instagram_handle)} | ${cell(r.p.city)}, ${r.p.state} | ${cell(r.artist!.display_name)} (@${cell(r.artist!.instagram_handle)}) | ${cell(place.city)}, ${cell(place.state)} | ${r.match_key} | ${cell(r.fields_to_add.join(", "))} |`)
  }
  md.push(`\n## Spot-check: 10 random probable matches (review only, never automatic)\n`)
  md.push(`| TW profile | Studio name on TW | Our shop | City | Score |\n|---|---|---|---|---:|`)
  for (const r of seeded(all.filter((x) => x.match_key === "probable_studio_name"), 10)) {
    md.push(`| [${cell(r.p.name)}](${r.p.url}) | ${cell(r.p.is_studio ? r.p.name : r.p.studio_name)} | ${cell(r.shop?.name)} | ${cell(r.shop?.city)}, ${cell(r.shop?.state)} | ${r.probable_score?.toFixed(2)} |`)
  }
  const mdPath = path.join(REPORT_DIR, sampleRun ? "tattooswizard-summary.sample.md" : "tattooswizard-summary.md")
  fs.writeFileSync(mdPath, md.join("\n") + "\n")

  console.log(`Status counts: ${STATUSES.map((s) => `${s} ${tierCounts[0][s] ?? 0}`).join(", ")}`)
  console.log(`\nWrote ${csvPath}\nWrote ${mdPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
