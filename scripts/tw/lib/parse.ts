// scripts/tw/lib/parse.ts
// Parses one cached TattoosWizard profile page into the fields we research.
// Sources, in order of preference (each field records which one it came from):
//   json   — the Angular transfer state (<script id="serverApp-state">), which
//            holds the site's own API responses for /tattooists/<user> and /stats
//   jsonld — the schema.org Person block
//   meta   — Open Graph / meta description
//   html   — visible markup
// Bios, images and price estimates are never kept. The bio is read only to pull
// out a studio name/handle and a guest-spot/traveling flag.

import { matchStyleSlugs } from "../../../lib/styles"
import { STATE_ABBR_TO_NAME, STATE_NAME_TO_ABBR } from "../../../lib/utils/states"
import { SITE, canonicalProfileUrl } from "./common"

export type Method = "json" | "jsonld" | "meta" | "html" | "bio"
export type StudioConfidence = "structured" | "link" | "bio"

export interface StyleCount {
  style: string
  count: number | null
}

export interface Profile {
  url: string
  username: string
  name: string | null
  instagram_handle: string | null
  instagram_followers: number | null
  followers_checked_at: string | null
  is_studio: boolean | null
  city: string | null
  state: string | null
  country: string | null
  main_style: string | null
  style_tags: StyleCount[]
  style_slugs: string[]
  unmapped_styles: string[]
  website: string | null
  phone: string | null
  studio_name: string | null
  studio_handle: string | null
  studio_confidence: StudioConfidence | null
  roster_urls: string[]
  guest_or_traveling: boolean
  methods: Record<string, Method>
  parse_error: string | null
}

type Json = Record<string, unknown>

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)

function titleCase(s: string): string {
  return s.replace(/\b([a-z])([a-z]*)/g, (_, a: string, b: string) => a.toUpperCase() + b)
}

// "1.5M", "625.6K", "625,6m", "12,345", "980" → number. Null if it doesn't parse.
export function parseFollowers(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.round(raw) : null
  const s = String(raw ?? "").trim().replace(/\s+/g, "").replace(/followers?$/i, "")
  const m = s.match(/^([\d.,]+)([kmb])?$/i)
  if (!m) return null
  let num = m[1]
  const suffix = m[2]?.toLowerCase()
  if (suffix) {
    // With a suffix, a single comma or dot is the decimal mark ("625,6m").
    num = num.replace(/,(?=\d{1,2}$)/, ".").replace(/,/g, "")
  } else {
    // Without one, commas/dots followed by three digits are thousands separators.
    num = num.replace(/[.,](?=\d{3}(\D|$))/g, "").replace(",", ".")
  }
  const n = parseFloat(num)
  if (!Number.isFinite(n)) return null
  const mult = suffix === "k" ? 1e3 : suffix === "m" ? 1e6 : suffix === "b" ? 1e9 : 1
  return Math.round(n * mult)
}

// US numbers only → +1XXXXXXXXXX. Anything else → null.
export function normalizeUsPhone(raw: unknown): string | null {
  let d = String(raw ?? "").replace(/\D/g, "")
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1)
  return d.length === 10 ? `+1${d}` : null
}

const IG_RESERVED = new Set(["p", "reel", "reels", "explore", "stories", "tv", "accounts", "direct", "share"])

/** Instagram handle from a URL or "@handle"; handles the site's doubled URLs. */
export function instagramHandle(raw: unknown): string | null {
  const s = String(raw ?? "").trim()
  if (!s) return null
  const urls = Array.from(s.matchAll(/instagram\.com\/([A-Za-z0-9._]+)/gi), (m) => m[1])
  const candidate = urls.length ? urls[urls.length - 1] : s.replace(/^@/, "")
  const h = candidate.toLowerCase().replace(/\.+$/, "")
  if (!/^[a-z0-9._]{1,30}$/.test(h) || IG_RESERVED.has(h) || h === "https" || h === "www") return null
  return h
}

function countryCode(country: string | null, code: string | null): string | null {
  const c = (code ?? "").toLowerCase()
  const n = (country ?? "").toLowerCase().trim()
  if (c === "usa" || c === "us" || n === "united states" || n === "usa" || n === "united states of america") return "US"
  if (code && code.length <= 3) return code.toUpperCase()
  return country ? titleCase(country) : null
}

function stateCode(state: string | null, code: string | null, country: string | null): string | null {
  if (country !== "US") return code ? code.toUpperCase() : state ? titleCase(state) : null
  const c = (code ?? "").toUpperCase()
  if (c.length === 2 && STATE_ABBR_TO_NAME[c]) return c
  const byName = state ? STATE_NAME_TO_ABBR[state.toLowerCase().trim()] : undefined
  if (byName) return byName
  const s = (state ?? "").toUpperCase().trim()
  return STATE_ABBR_TO_NAME[s] ? s : null
}

// ---- source extraction ------------------------------------------------------

interface Sources {
  main: Json | null // /tattooists/<username>
  stats: Json | null // /tattooists/<username>/stats
  person: Json | null // JSON-LD Person
  meta: Record<string, string>
  html: string
}

function extractSources(html: string, username: string): Sources {
  let main: Json | null = null
  let stats: Json | null = null
  const state = html.match(/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/)
  if (state) {
    try {
      const data = JSON.parse(state[1]) as Record<string, unknown>
      for (const entry of Object.values(data)) {
        if (!entry || typeof entry !== "object") continue
        const { url, body } = entry as { url?: string; body?: unknown }
        if (!url || !body || typeof body !== "object") continue
        const m = url.match(/\/tattooists\/([^/?]+)(\/stats)?(?:\?|$)/)
        if (!m || decodeURIComponent(m[1]).toLowerCase() !== username) continue
        if (m[2]) stats = body as Json
        else main = body as Json
      }
    } catch {
      // fall through to the other sources
    }
  }

  let person: Json | null = null
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const d = JSON.parse(m[1]) as Json
      const graph = (Array.isArray(d["@graph"]) ? d["@graph"] : [d]) as Json[]
      person = graph.find((g) => g["@type"] === "Person" || g["@type"] === "LocalBusiness" || g["@type"] === "TattooParlor") ?? person
    } catch {
      // ignore malformed JSON-LD
    }
  }

  const meta: Record<string, string> = {}
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)="([^"]+)"[^>]+content="([^"]*)"/g)) meta[m[1]] = decodeEntities(m[2])

  return { main, stats, person, meta, html }
}

// ---- studio extraction from the bio ----------------------------------------

const STUDIO_WORDS = /\b(tattoo|tattoos|tattooing|ink|inks|studio|studios|parlou?r|gallery|collective|co\.?|company|shop|club|society|atelier|house|lounge|social|art|arts|body art)\b/i
const BIO_PATTERNS: RegExp[] = [
  /\b(?:co-?owner|owner|founder|co-?founder)\s+(?:of|at)\s+((?:[A-Z0-9][\w'’.&-]*\s?){1,6})/,
  /\b(?:works?|working|tattoos?|tattooing|resident(?: artist)?|apprentice|found)\s+(?:at|out of|in-house at)\s+((?:[A-Z0-9][\w'’.&-]*\s?){1,6})/,
  /\bat\s+((?:[A-Z0-9][\w'’.&-]*\s?){1,6})/,
]

const PLACE_WORDS = new Set([
  ...Object.keys(STATE_NAME_TO_ABBR),
  "united states", "usa", "us", "america",
])

/** True for "Portland, Oregon", "New York", "Brooklyn" (the profile's own place) and the like. */
function looksLikePlace(name: string, city: string | null, state: string | null): boolean {
  const n = name.toLowerCase().replace(/[^a-z, ]+/g, " ").replace(/\s+/g, " ").trim()
  const parts = n.split(",").map((x) => x.trim()).filter(Boolean)
  const c = (city ?? "").toLowerCase()
  const st = state ? (STATE_ABBR_TO_NAME[state] ?? state).toLowerCase() : ""
  if (parts.length > 1 && parts.slice(1).every((x) => PLACE_WORDS.has(x) || x === c || x.length === 2)) return true
  return parts.every((x) => x === c || x === st || PLACE_WORDS.has(x))
}

function cleanStudioName(raw: string): string | null {
  const s = raw.replace(/[\s,.;:!-]+$/, "").replace(/^the\s+/i, "The ").trim()
  if (s.length < 3 || s.length > 60) return null
  return s
}

/** Studio name / handle mentioned in the bio, never the bio itself. */
function studioFromBio(bio: string, ownHandle: string | null, ownName: string | null, city: string | null, state: string | null): { name: string | null; handle: string | null } {
  let name: string | null = null
  for (const re of BIO_PATTERNS) {
    const m = bio.match(re)
    if (!m) continue
    const cand = cleanStudioName(m[1])
    // "X, United States" / "X, Texas" right after the match means X is a place.
    const after = bio.slice((m.index ?? 0) + m[0].length - 1, (m.index ?? 0) + m[0].length + 30).toLowerCase()
    const placeAfter = /^\S?\s*,\s*([a-z ]+)/.exec(after)?.[1]?.trim()
    const isPlace = !cand || looksLikePlace(cand, city, state) || (placeAfter !== undefined && Array.from(PLACE_WORDS).some((w) => placeAfter.startsWith(w)))
    // The loose "at X" pattern needs a studio-ish word, so "at Los Angeles" is skipped.
    if (cand && !isPlace && (re !== BIO_PATTERNS[2] || STUDIO_WORDS.test(cand)) && cand.toLowerCase() !== (ownName ?? "").toLowerCase()) {
      name = cand
      break
    }
  }
  let handle: string | null = null
  for (const m of bio.matchAll(/(?:^|[^\w@.])@([A-Za-z0-9._]{2,30})/g)) {
    const h = m[1].toLowerCase().replace(/\.+$/, "")
    // Skip the artist's own handle, email providers and domains ("@coniun.io").
    if (h !== ownHandle && !/^(gmail|yahoo|hotmail|icloud|outlook)/.test(h) && !/\.(com|io|net|org|co|me|app|art|us)$/.test(h)) {
      handle = h
      break
    }
  }
  return { name, handle }
}

const TRAVELING = /\b(guest spots? only|only (?:does|doing|do) guest spots|travel(?:l)?ing (?:tattoo )?artist|currently travel(?:l)?ing|travel(?:l)?ing full[- ]time|nomad(?:ic)? (?:tattoo )?artist|no (?:fixed|permanent) (?:studio|shop|location|home base))\b/i

// ---- main parse -------------------------------------------------------------

export function parseProfile(html: string, url: string, checkedAt: string): Profile {
  const username = decodeURIComponent(url.split("/artists/")[1] ?? "").toLowerCase()
  const p: Profile = {
    url,
    username,
    name: null,
    instagram_handle: null,
    instagram_followers: null,
    followers_checked_at: null,
    is_studio: null,
    city: null,
    state: null,
    country: null,
    main_style: null,
    style_tags: [],
    style_slugs: [],
    unmapped_styles: [],
    website: null,
    phone: null,
    studio_name: null,
    studio_handle: null,
    studio_confidence: null,
    roster_urls: [],
    guest_or_traveling: false,
    methods: {},
    parse_error: null,
  }
  const src = extractSources(html, username)
  const set = <K extends keyof Profile>(field: K, value: Profile[K] | null | undefined, method: Method): boolean => {
    if (value === null || value === undefined || value === "" || p[field] !== null) return false
    p[field] = value as Profile[K]
    p.methods[field] = method
    return true
  }
  const { main, stats, person, meta } = src
  const loc = (main?.location ?? null) as Json | null
  const social = (main?.social_links ?? null) as Json | null
  const personLoc = ((person?.workLocation as Json | undefined)?.address ?? null) as Json | null
  const sameAs = (Array.isArray(person?.sameAs) ? person!.sameAs : person?.sameAs ? [person.sameAs] : []) as string[]
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]
  const ogTitle = meta["og:title"] ?? null

  // name
  set("name", str(main?.name) ?? str(main?.full_name), "json")
  set("name", str(person?.name), "jsonld")
  set("name", ogTitle ? ogTitle.split("|")[0].trim() : null, "meta")
  set("name", h1 ? decodeEntities(h1.replace(/<[^>]+>/g, "")).trim() : null, "html")

  // Instagram handle + followers
  set("instagram_handle", instagramHandle(social?.instagram), "json")
  set("instagram_handle", instagramHandle(sameAs.find((u) => /instagram\.com/i.test(u))), "jsonld")
  set("instagram_handle", instagramHandle(html.match(/href="(https?:\/\/(?:www\.)?instagram\.com\/[^"]+)"/i)?.[1]), "html")
  set("instagram_followers", parseFollowers(main?.follower_count ?? null), "json")
  set("instagram_followers", parseFollowers(html.match(/<dt[^>]*>\s*Followers\s*<\/dt>\s*<dd[^>]*>\s*([^<]+?)\s*<\/dd>/i)?.[1]), "html")
  if (p.instagram_followers !== null) {
    p.followers_checked_at = checkedAt
    p.methods.followers_checked_at = p.methods.instagram_followers
  }

  // studio or artist
  set("is_studio", typeof main?.studio === "boolean" ? main.studio : null, "json")
  const jobTitle = str(person?.jobTitle)
  set("is_studio", jobTitle ? /studio|shop|parlou?r/i.test(jobTitle) : null, "jsonld")
  set("is_studio", ogTitle && ogTitle.includes("|") ? /studio|shop|parlou?r/i.test(ogTitle.split("|")[1]) : null, "meta")

  // location
  set("country", countryCode(str(loc?.country), str(loc?.country_code)), "json")
  set("country", countryCode(str(personLoc?.addressCountry), null), "jsonld")
  set("city", str(loc?.city) ? titleCase(str(loc?.city)!) : null, "json")
  set("city", str(personLoc?.addressLocality) ? titleCase(str(personLoc?.addressLocality)!) : null, "jsonld")
  set("state", stateCode(str(loc?.state), str(loc?.state_code), p.country), "json")
  set("state", stateCode(str(personLoc?.addressRegion), null, p.country), "jsonld")

  // styles: portfolio counts first, then the profile's tags
  const counts = (Array.isArray(stats?.style_counts) ? stats!.style_counts : []) as { style?: string; count?: number }[]
  const tags = (Array.isArray(main?.tags) ? main!.tags : []) as string[]
  let styleMethod: Method | null = null
  if (counts.length) {
    p.style_tags = counts.filter((c) => str(c.style)).map((c) => ({ style: c.style!, count: typeof c.count === "number" ? c.count : null }))
    styleMethod = "json"
  }
  if (!p.style_tags.length && tags.length) {
    p.style_tags = tags.filter((t) => str(t)).map((t) => ({ style: t, count: null }))
    styleMethod = "json"
  }
  const knowsAbout = (Array.isArray(person?.knowsAbout) ? person!.knowsAbout : []) as string[]
  if (!p.style_tags.length && knowsAbout.length) {
    p.style_tags = knowsAbout.map((t) => ({ style: String(t), count: null }))
    styleMethod = "jsonld"
  }
  const metaStyles = meta["description"]?.match(/Styles?:\s*([^.]+)/)?.[1]
  if (!p.style_tags.length && metaStyles) {
    p.style_tags = metaStyles.split(",").map((t) => ({ style: t.trim(), count: null })).filter((t) => t.style)
    styleMethod = "meta"
  }
  if (styleMethod) {
    p.methods.style_tags = styleMethod
    // Main style: the profile's first tag (its own headline style), else the biggest portfolio count.
    p.main_style = str(tags[0]) ?? p.style_tags[0]?.style ?? null
    p.methods.main_style = styleMethod
    const slugs = new Set<string>()
    for (const t of p.style_tags) {
      const matched = matchStyleSlugs(t.style)
      if (matched.length) matched.forEach((s) => slugs.add(s))
      else p.unmapped_styles.push(t.style)
    }
    p.style_slugs = Array.from(slugs)
    if (p.style_slugs.length) p.methods.style_slugs = styleMethod
  }

  // website + phone
  set("website", str(main?.website), "json")
  set("website", sameAs.find((u) => !/instagram\.com|facebook\.com|tiktok\.com/i.test(u)) ?? null, "jsonld")
  set("phone", normalizeUsPhone(main?.phone), "json")
  set("phone", normalizeUsPhone(decodeEntities(html.match(/href="tel:([^"]+)"/i)?.[1] ?? "")), "html")

  // studio for artists: structured field → linked studio profile → bio patterns
  if (p.is_studio !== true) {
    const structuredName = str(loc?.name) ?? str(loc?.short_name) ?? str((person?.worksFor as Json | undefined)?.name)
    if (structuredName && structuredName.toLowerCase() !== (p.name ?? "").toLowerCase() && !looksLikePlace(structuredName, p.city, p.state)) {
      p.studio_name = structuredName
      p.studio_confidence = "structured"
      p.methods.studio_name = str(loc?.name) || str(loc?.short_name) ? "json" : "jsonld"
    }
    const studioRef = (main?.studio_profile ?? main?.studio_username ?? main?.studio_id ?? null) as unknown
    if (typeof studioRef === "string" && /^[a-z0-9._-]+$/i.test(studioRef)) {
      p.studio_handle = studioRef.toLowerCase()
      p.studio_confidence ??= "link"
      p.methods.studio_handle = "json"
    }
    const bio = decodeEntities(String(main?.description ?? person?.description ?? ""))
    const nameText = p.name ?? ""
    if (!p.studio_name || !p.studio_handle) {
      const fromBio = studioFromBio(`${nameText} ${bio}`, p.instagram_handle, p.name, p.city, p.state)
      if (!p.studio_name && fromBio.name) {
        p.studio_name = fromBio.name
        p.methods.studio_name = "bio"
      }
      if (!p.studio_handle && fromBio.handle) {
        p.studio_handle = fromBio.handle
        p.methods.studio_handle = "bio"
      }
      if ((fromBio.name || fromBio.handle) && !p.studio_confidence) p.studio_confidence = "bio"
    }
    p.guest_or_traveling = TRAVELING.test(bio)
  }

  // roster for studios
  if (p.is_studio) {
    const roster = (Array.isArray(main?.studio_artists) ? main!.studio_artists : []) as unknown[]
    const urls = new Set<string>()
    for (const r of roster) {
      const ref = typeof r === "string" ? r : str((r as Json)?.username) ?? str((r as Json)?.url)
      const u = ref ? canonicalProfileUrl(ref.startsWith("http") || ref.startsWith("/") ? ref : `${SITE}/artists/${ref}`) : null
      if (u && u !== url) urls.add(u)
    }
    p.roster_urls = Array.from(urls)
    if (p.roster_urls.length) p.methods.roster_urls = "json"
  }

  if (!main && !person) p.parse_error = "no embedded JSON or JSON-LD on the page"
  else if (!p.name) p.parse_error = "no name found"
  return p
}
