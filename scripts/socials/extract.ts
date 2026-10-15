// scripts/socials/extract.ts
// Parses the crawl cache (scripts/socials/crawl.ts) into one line per site in
// data/cache/socials/extracted.jsonl. Fetches nothing; safe to rerun.
//
// Per site:
//   - website_status (ok, redirected_to_other_domain, not_found, dead, parked, error)
//   - one Instagram, TikTok, Facebook and YouTube pick. Candidates are profile
//     links in anchors and JSON-LD "sameAs" on the homepage, contact and about
//     pages (on artists pages only the header and footer count). Links in the
//     header, footer, nav or JSON-LD are preferred; among them the handle that
//     best resembles the shop name wins. Others go to "alternates"; the pick is
//     "ambiguous" when the runner-up is close (within 0.15 similarity).
//   - a profile found on 3+ sites of unrelated shops (a web designer, a theme
//     default) is dropped everywhere.
//   - artists pages (linked or titled artists, team, staff, crew): each
//     Instagram link in the page body paired with the person's name in the same
//     card or block.
//
// Run: npx tsx scripts/socials/extract.ts [--examples 10]

import fs from "fs"
import path from "path"
import * as cheerio from "cheerio"
import { cleanName, namesAgree } from "../tw/lib/names"
import { numOption, writeJsonl } from "../tw/lib/common"
import { DICT, EXTRACT_FILE, REPORT_DIR, SCOPE_FILE, handleScore, readSite, websiteStatus, type Scope, type ScopeShop, type WebsiteStatus } from "./lib/common"
import { PLATFORMS, socialHost, socialProfile, type Platform, type SocialProfile } from "./lib/social"

// domhandler's node types, via cheerio (domhandler isn't a direct dependency).
type AnyNode = Exclude<Parameters<typeof cheerio.load>[0], string | Buffer | unknown[]>
type Element = Extract<AnyNode, { tagName: string }>

const CLOSE = 0.15
const SHARED_SITES = 3

type Where = "chrome" | "jsonld" | "body"
interface Found extends SocialProfile {
  where: Where
  page: string
}
export interface Pick {
  url: string
  key: string
  where: Where
  score: number
  ambiguous: boolean
  reason?: string
  alternates: string[]
}
export interface PageArtist {
  name: string
  raw_name: string
  handle: string
  page_url: string
  role: "piercer" | "cosmetic" | null
}
export interface Extracted {
  key: string
  url: string
  shop_ids: string[]
  checked_at: string
  status: WebsiteStatus
  status_detail: string
  final_url: string | null
  picks: Partial<Record<Platform, Pick>>
  dropped_shared: string[]
  ignored_links: number
  artist_pages: string[]
  artists: PageArtist[]
}

// ---- page parsing ---------------------------------------------------------------

const CHROME_TAGS = new Set(["header", "footer", "nav"])
const CHROME_ATTR = /(^|[\s_-])(header|footer|masthead|navbar|nav|menu|topbar|bottombar|social|socials|social-icons|sociallinks|colophon)([\s_-]|$)/i

function where$($: cheerio.CheerioAPI, el: Element): Where {
  let node: AnyNode | null = el
  for (let depth = 0; node && depth < 15; depth++, node = node.parent) {
    if (node.type !== "tag") continue
    const tag = (node as Element).tagName.toLowerCase()
    if (CHROME_TAGS.has(tag)) return "chrome"
    const role = $(node).attr("role")
    if (role === "banner" || role === "contentinfo" || role === "navigation") return "chrome"
    const attrs = `${$(node).attr("id") ?? ""} ${$(node).attr("class") ?? ""}`
    if (CHROME_ATTR.test(attrs)) return "chrome"
  }
  return "body"
}

function sameAs(value: unknown, out: string[]): void {
  if (!value || typeof value !== "object") return
  if (Array.isArray(value)) {
    for (const v of value) sameAs(v, out)
    return
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k === "sameAs") {
      for (const s of Array.isArray(v) ? v : [v]) if (typeof s === "string") out.push(s)
    } else if (v && typeof v === "object") sameAs(v, out)
  }
}

function pageLinks($: cheerio.CheerioAPI, pageUrl: string): { found: Found[]; ignored: number } {
  const found: Found[] = []
  let ignored = 0
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim()
    if (!socialHost(href)) return
    const p = socialProfile(href)
    if (!p) {
      ignored++
      return
    }
    found.push({ ...p, where: where$($, el), page: pageUrl })
  })
  $('script[type="application/ld+json"]').each((_, el) => {
    let data: unknown
    try {
      data = JSON.parse($(el).text())
    } catch {
      return
    }
    const urls: string[] = []
    sameAs(data, urls)
    for (const u of urls) {
      const p = socialProfile(u)
      if (p) found.push({ ...p, where: "jsonld", page: pageUrl })
      else if (socialHost(u)) ignored++
    }
  })
  return { found, ignored }
}

// ---- artists pages --------------------------------------------------------------

const NOT_NAME = new Set([
  "book", "booking", "bookings", "now", "our", "team", "artist", "artists", "meet", "contact", "instagram", "follow",
  "view", "portfolio", "gallery", "about", "more", "see", "work", "tattoo", "tattoos", "tattooing", "studio", "piercer",
  "piercing", "piercings", "apprentice", "manager", "click", "here", "home", "shop", "info", "email", "call", "schedule",
  "appointment", "appointments", "welcome", "resident", "residents", "guest", "guests", "spot", "available", "inquire",
  "read", "bio", "learn", "flash", "art", "ink", "llc", "inc", "facebook", "tiktok", "youtube", "twitter", "website",
  "consult", "consultation", "request", "message", "dm", "on", "my", "me", "us", "of", "and", "the", "at", "with",
  "profile", "page", "link", "links", "staff", "crew", "owner", "owners", "front", "desk", "laser", "removal", "specialist",
  "piercers", "tattooer", "tattooers", "tattooist", "artwork", "custom", "designs", "faq", "faqs", "aftercare", "store",
  "location", "locations", "hours", "open", "closed", "privacy", "policy", "terms", "copyright", "rights",
  "palette", "style", "styles", "realism", "micro", "fine", "line", "color", "colour", "black", "grey", "gray",
  "traditional", "neo", "japanese", "blackwork", "dotwork", "illustrative", "watercolor", "lettering", "portraits",
  "cover", "covers", "ups", "all", "any", "new", "hire", "hiring", "join", "apply", "gift", "card", "cards", "merch",
  "prices", "pricing", "deposit", "deposits", "events", "news", "blog", "reviews", "testimonials", "photos", "videos",
  "founder", "cofounder", "co-founder", "director", "receptionist", "assistant", "apprentices", "pmu", "microblading",
  "brows", "lashes", "esthetician", "cosmetic", "cosmetics", "makeup", "spa", "salon", "barber", "nails",
  "podcast", "show", "episode", "radio", "venmo", "paypal", "cashapp", "zelle", "recovery", "minimalist", "minimal", "habla", "espanol", "español",
  "fineline", "dates", "rates", "pets", "note", "notes", "ball", "portfolios", "tik", "tok", "coverup", "cover-up",
  "studios", "mon", "tue", "tues", "wed", "thu", "thur", "thurs", "fri", "sat", "sun", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday", "sunday", "weekdays", "weekends", "daily", "yonkers", "ig", "insta", "im", "hi", "hey", "hello", "specializes", "specializing", "specialty", "specialties",
  "online", "virtual", "social", "media", "socials", "services", "service", "zodiac", "sign", "signs", "picture", "pictures", "image", "images", "anime", "photo", "logo", "icon", "avatar", "headshot", "portrait",
])



/**
 * "Jane Doe – Owner | Tattoo Artist" → "Jane Doe" if it reads like a person's
 * name: 1–4 words of letters, each capitalized (or the name shows up in the
 * handle), no role or page words, dots only after initials.
 */
function personName(raw: string, handle: string): string | null {
  let s = raw.replace(/\s+/g, " ").trim()
  s = s.split(/\s[-–—|•·:]\s|[|•·]|\(|,|\n/)[0].trim()
  s = s.replace(/^(hi|hey|hello)?[\s!,.]*(i['’]?m|i am|meet|this is)\s+/i, "")
  // "G R E Y" → "GREY"
  if (/^(\p{L} ){2,}\p{L}$/u.test(s)) s = s.replace(/ /g, "")
  s = cleanName(s)
  if (s.length < 2 || s.length > 40) return null
  let words = s.split(" ")
  // A trailing repeat of the handle ("Felisha felishaarella", "Johana Rodriguez JohanaRodri").
  const hk = handle.replace(/[^a-z0-9]/g, "")
  const last = words[words.length - 1]
  const lk = last.toLowerCase().replace(/[^a-z0-9]/g, "")
  if (words.length > 1 && lk.length >= 5 && hk.includes(lk) && !/^\p{Lu}\p{Ll}+$/u.test(last)) {
    words = words.slice(0, -1)
    s = words.join(" ")
  }
  if (words.length > 4) return null
  if (!words.every((w) => /^\p{L}[\p{L}'’-]*$/u.test(w) || /^\p{L}{1,2}\.$/u.test(w))) return null
  if (words.some((w) => NOT_NAME.has(w.toLowerCase().replace(/[^\p{L}]/gu, "")))) return null
  const inHandle = words.some((w) => w.length >= 3 && handle.replace(/[._\d]/g, "").includes(w.toLowerCase().replace(/[^a-z]/g, "")))
  if (!inHandle && !words.every((w) => /^\p{Lu}/u.test(w))) return null
  // No capital letter at all: link text repeating the handle ("dotsbydicky").
  if (!/\p{Lu}/u.test(s)) return null
  // Every word a common lowercase word ("Next Dates", "Picture"): a phrase, not a name.
  const common = (w: string) => {
    const lower = w.toLowerCase().replace(/[.'’]/g, "")
    return DICT.has(lower) && !DICT.has(lower[0].toUpperCase() + lower.slice(1))
  }
  if (words.every(common) && !(words.length === 1 && inHandle)) return null
  // A CamelCase brand ("TheRenegadePearlCLT", "SpearsAndNeedles").
  if (words.some((w) => (w.match(/\p{Ll}\p{Lu}/gu) ?? []).length >= 2)) return null
  return s
}

const NAME_SELECTORS = "h1, h2, h3, h4, h5, h6, [class*=name], [class*=Name], [class*=title], [class*=Title], strong, b, p, span, a"

function pageArtists($: cheerio.CheerioAPI, pageUrl: string, shopKeys: Set<string>): PageArtist[] {
  const out: PageArtist[] = []
  const seen = new Set<string>()
  const igIn = (node: AnyNode): Set<string> => {
    const keys = new Set<string>()
    $(node).find("a[href]").each((_, a) => {
      const p = socialProfile($(a).attr("href") ?? "")
      if (p?.platform === "instagram") keys.add(p.key)
    })
    return keys
  }
  $("a[href]").each((_, el) => {
    const p = socialProfile($(el).attr("href") ?? "")
    if (!p || p.platform !== "instagram" || shopKeys.has(p.key) || seen.has(p.key)) return
    if (where$($, el) !== "body") return
    // The card: the largest ancestor (up to 6 levels) holding only this handle.
    let card: AnyNode = el
    let node: AnyNode | null = el.parent
    for (let depth = 0; node && node.type === "tag" && depth < 6; depth++, node = node.parent) {
      const keys = igIn(node)
      if (keys.size !== 1) break
      card = node
      if ((node as Element).tagName === "body" || (node as Element).tagName === "main") break
    }
    if (card === el) return
    let name: string | null = null
    let raw = ""
    $(card).find(NAME_SELECTORS).each((_, n) => {
      if (name) return
      // Only the element's own text (not a whole nested block).
      const t = $(n).children().length > 3 ? "" : $(n).text()
      const pn = t ? personName(t, p.key) : null
      if (pn) {
        name = pn
        raw = t.replace(/\s+/g, " ").trim().slice(0, 80)
      }
    })
    if (!name) {
      const alt = $(card).find("img[alt]").first().attr("alt") ?? ""
      const pn = personName(alt, p.key)
      if (pn) {
        name = pn
        raw = alt
      }
    }
    if (!name) return
    const text = $(card).text().toLowerCase()
    const role = /pmu|brows|lash|microblad|cosmetic|makeup|beauty|esthetic|skincare|hair|barber|salon|nails/.test(p.key)
      ? "cosmetic"
      : /pierc/.test(p.key) && !/tat/.test(p.key)
        ? "piercer"
      : /\btattoo/.test(text)
        ? null
        : /\bpierc(er|ing)\b/.test(text)
          ? "piercer"
          : /\b(pmu|microblad\w*|permanent make-?up|brows?|lash(es)?|esthetic\w*)\b/.test(text)
            ? "cosmetic"
            : null
    seen.add(p.key)
    out.push({ name, raw_name: raw, handle: p.key, page_url: pageUrl, role })
  })
  return out
}

// ---- picking --------------------------------------------------------------------

function pickFor(platform: Platform, found: Found[], shops: ScopeShop[]): Pick | undefined {
  const mine = found.filter((f) => f.platform === platform)
  if (!mine.length) return undefined
  const preferred = mine.filter((f) => f.where !== "body")
  const pool = preferred.length ? preferred : mine
  const byKey = new Map<string, { f: Found; count: number; where: Where }>()
  for (const f of pool) {
    const cur = byKey.get(f.key)
    if (cur) {
      cur.count++
      if (f.where === "jsonld" || (f.where === "chrome" && cur.where === "body")) cur.where = f.where
    } else byKey.set(f.key, { f, count: 1, where: f.where })
  }
  const ranked = Array.from(byKey.values())
    .map((x) => ({ ...x, score: handleScore(x.f.name || x.f.key, shops) }))
    .sort((a, b) => b.score - a.score || b.count - a.count || a.f.key.localeCompare(b.f.key))
  const top = ranked[0]
  const alternates = Array.from(new Set(mine.map((f) => f.url))).filter((u) => u !== top.f.url)
  const ambiguous = ranked.length > 1 && top.score - ranked[1].score < CLOSE
  return { url: top.f.url, key: top.f.key, where: top.where, score: top.score, ambiguous, reason: ambiguous ? "two candidates are close" : undefined, alternates }
}

// ---- main -----------------------------------------------------------------------

const ARTIST_TITLE = /\b(our[ -]?)?artists?\b|\bteam\b|\bstaff\b|\bcrew\b|\btattooers?\b|\bresidents?\b/i

function main() {
  if (!fs.existsSync(SCOPE_FILE)) throw new Error(`No scope at ${SCOPE_FILE}. Run scripts/socials/crawl.ts first.`)
  const scope = JSON.parse(fs.readFileSync(SCOPE_FILE, "utf-8")) as Scope

  // Pass 1: parse every cached site.
  type Parsed = { site: (typeof scope.sites)[number]; st: ReturnType<typeof websiteStatus>; checkedAt: string; finalUrl: string | null; found: Found[]; ignored: number; artistPages: string[]; people: PageArtist[] }
  const parsed: Parsed[] = []
  for (const site of scope.sites) {
    const rec = readSite(site.key)
    if (!rec) continue
    const found: Found[] = []
    let ignored = 0
    const artistPages: string[] = []
    const artistHtml: { url: string; html: string }[] = []
    const pages: { reason: string; url: string; html: string }[] = []
    if (rec.home?.kind === "ok" && rec.home.html) pages.push({ reason: "home", url: rec.home.final_url, html: rec.home.html })
    for (const p of rec.pages) if (p.outcome.kind === "ok" && p.outcome.html) pages.push({ reason: p.reason, url: p.outcome.final_url, html: p.outcome.html })
    const status = websiteStatus(rec).status
    if (status === "ok") {
      for (const pg of pages) {
        const $ = cheerio.load(pg.html)
        const title = `${$("title").text()} ${$("h1").first().text()}`
        const isArtists = pg.reason === "artists" || (pg.reason !== "home" && ARTIST_TITLE.test(title))
        const { found: f, ignored: ig } = pageLinks($, pg.url)
        ignored += ig
        // On artists pages only the header and footer speak for the shop.
        found.push(...(isArtists ? f.filter((x) => x.where !== "body") : f))
        if (isArtists) {
          artistPages.push(pg.url)
          artistHtml.push({ url: pg.url, html: pg.html })
        }
      }
    }
    // People are parsed now (page HTML isn't kept: 11k sites don't fit in memory).
    const shopKeys = new Set(found.filter((f) => f.platform === "instagram").map((f) => f.key))
    const people: PageArtist[] = []
    for (const ap of artistHtml) people.push(...pageArtists(cheerio.load(ap.html), ap.url, shopKeys))
    parsed.push({ site, st: websiteStatus(rec), checkedAt: rec.checked_at, finalUrl: rec.home?.final_url ?? null, found, ignored, artistPages, people })
  }

  // Pass 2: profiles on 3+ sites of unrelated shops are designers or defaults.
  const sitesByKey = new Map<string, Parsed[]>()
  for (const p of parsed) for (const k of new Set(p.found.map((f) => `${f.platform}:${f.key}`))) sitesByKey.set(k, [...(sitesByKey.get(k) ?? []), p])
  const shared = new Set<string>()
  for (const [k, list] of sitesByKey) {
    if (list.length < SHARED_SITES) continue
    const shops = list.flatMap((p) => p.site.shops)
    const related = shops.every((s) => namesAgree(s.name, shops[0].name, [s.city, shops[0].city]) !== null)
    if (!related) shared.add(k)
  }

  const out: Extracted[] = []
  for (const p of parsed) {
    const st = p.st
    const dropped = Array.from(new Set(p.found.filter((f) => shared.has(`${f.platform}:${f.key}`)).map((f) => f.url)))
    const found = p.found.filter((f) => !shared.has(`${f.platform}:${f.key}`))
    const picks: Partial<Record<Platform, Pick>> = {}
    for (const platform of PLATFORMS) {
      const pk = pickFor(platform, found, p.site.shops)
      if (pk) picks[platform] = pk
    }
    // The Instagram pick is named like the shop but another platform's pick
    // looks like someone else (an artist's TikTok, a sister shop's page): review.
    const ig = picks.instagram
    for (const platform of PLATFORMS) {
      const pk = picks[platform]
      if (platform === "instagram" || !pk || pk.ambiguous || !ig || ig.ambiguous || ig.score < 0.6) continue
      const named = !/^(id:|channel\/)/.test(pk.key) && !/^\d+$/.test(pk.key)
      if (named && pk.score < 0.3) {
        pk.ambiguous = true
        pk.reason = "doesn't match the shop's name or its Instagram"
      }
    }
    const artists: PageArtist[] = []
    const seen = new Set<string>()
    for (const a of p.people) {
      if (seen.has(a.handle) || shared.has(`instagram:${a.handle}`)) continue
      seen.add(a.handle)
      artists.push(a)
    }
    // One "name" on several handles is a heading, not a person ("Palette").
    const nameCount = new Map<string, number>()
    for (const a of artists) nameCount.set(a.name.toLowerCase(), (nameCount.get(a.name.toLowerCase()) ?? 0) + 1)
    artists.splice(0, artists.length, ...artists.filter((a) => nameCount.get(a.name.toLowerCase()) === 1))
    out.push({
      key: p.site.key,
      url: p.site.url,
      shop_ids: p.site.shops.map((s) => s.id),
      checked_at: p.checkedAt,
      status: st.status,
      status_detail: st.detail,
      final_url: p.finalUrl,
      picks,
      dropped_shared: dropped,
      ignored_links: p.ignored,
      artist_pages: p.artistPages,
      artists,
    })
  }
  writeJsonl(EXTRACT_FILE, out)

  // Summary: fill rate per platform over sites reached (ok).
  const ok = out.filter((e) => e.status === "ok")
  const statusCounts: Record<string, number> = {}
  for (const e of out) statusCounts[e.status] = (statusCounts[e.status] ?? 0) + 1
  console.log(`Sites extracted: ${out.length} (${Object.entries(statusCounts).map(([k, v]) => `${k} ${v}`).join(", ")})`)
  console.log(`Fill rate over ${ok.length} reachable sites (clear pick / ambiguous):`)
  for (const pl of PLATFORMS) {
    const clear = ok.filter((e) => e.picks[pl] && !e.picks[pl]!.ambiguous).length
    const amb = ok.filter((e) => e.picks[pl]?.ambiguous).length
    console.log(`  ${pl.padEnd(9)} ${clear} (${((100 * clear) / Math.max(ok.length, 1)).toFixed(0)}%) / ${amb}`)
  }
  console.log(`Artists pages: ${ok.filter((e) => e.artist_pages.length).length} sites; people with Instagram: ${ok.reduce((n, e) => n + e.artists.length, 0)}`)
  console.log(`Dropped as shared across unrelated sites: ${shared.size} profiles — ${Array.from(shared).slice(0, 20).join(", ")}`)

  const k = numOption("--examples") ?? 10
  const withPicks = ok.filter((e) => Object.keys(e.picks).length)
  let s = 11
  const sample = [...withPicks]
  for (let i = sample.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2 ** 31
    const j = s % (i + 1)
    ;[sample[i], sample[j]] = [sample[j], sample[i]]
  }
  const names = new Map(scope.sites.map((x) => [x.key, x.shops.map((sh) => sh.name).join(" / ")]))
  console.log(`\n${k} example extractions:`)
  for (const e of sample.slice(0, k)) {
    console.log(`- ${names.get(e.key)} — ${e.url}`)
    for (const pl of PLATFORMS) {
      const pk = e.picks[pl]
      if (pk) console.log(`    ${pl}: ${pk.url} (${pk.where}, score ${pk.score}${pk.ambiguous ? ", AMBIGUOUS" : ""}${pk.alternates.length ? `, alternates: ${pk.alternates.join(" ")}` : ""})`)
    }
    for (const a of e.artists.slice(0, 5)) console.log(`    artist: ${a.name} @${a.handle}${a.role ? ` (${a.role})` : ""}`)
  }
  console.log(`\nWrote ${path.relative(process.cwd(), EXTRACT_FILE)}`)
  void REPORT_DIR
}

main()
