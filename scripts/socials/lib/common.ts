// scripts/socials/lib/common.ts
// Paths, the crawl scope (which shop websites get crawled) and the cached site
// record shared by scripts/socials/{crawl,extract,import}.ts.

import fs from "fs"
import path from "path"
import zlib from "zlib"
import { createHash } from "crypto"
import { socialHost } from "./social"
import { coreName, namesAgree } from "../../tw/lib/names"
import { similarity } from "../../lib/cleanup-utils"
import { nameKey } from "../../tw/lib/normalize"

export const CACHE_DIR = path.resolve("data/cache/socials")

// The system word list (macOS /usr/share/dict/words). A lone "name" that is a
// common lowercase word ("Picture", "Anime") isn't a person; a capitalized
// entry ("Brandon", "Anna") marks a common first name. Empty if absent.
export const DICT = (() => {
  try {
    return new Set(fs.readFileSync("/usr/share/dict/words", "utf-8").split("\n"))
  } catch {
    return new Set<string>()
  }
})()
export const SITES_DIR = path.join(CACHE_DIR, "sites")
export const SCOPE_FILE = path.join(CACHE_DIR, "scope.json")
export const EXTRACT_FILE = path.join(CACHE_DIR, "extracted.jsonl")
export const REPORT_DIR = path.resolve("data/reports")
export const USER_AGENT = "TattooMaps (support@tattoomaps.com)"

// Link-in-bio, booking, social, directory and form hosts: the page isn't the
// shop's own site. The first line is the list from the Step 2 brief.
const EXCLUDED_HOSTS = [
  "linktr.ee", "beacons.ai", "beacons.page", "booksy.com", "vagaro.com", "square.site", "squareup.com", "square.com", "facebook.com", "fb.com", "instagram.com", "yelp.com",
  "fb.me", "instagr.am", "tiktok.com", "youtube.com", "youtu.be", "twitter.com", "x.com", "threads.net", "pinterest.com", "myspace.com",
  "linkin.bio", "lnk.bio", "tap.bio", "bio.link", "solo.to", "msha.ke", "later.com", "linkpop.com", "campsite.bio", "poplme.co", "allmylinks.com", "hoo.be", "snipfeed.co",
  "fresha.com", "styleseat.com", "schedulicity.com", "glossgenius.com", "setmore.com", "acuityscheduling.com", "calendly.com", "getporter.io", "venue.ink", "tattoodo.com", "tattooswizard.com",
  "jotform.com", "typeform.com", "yahoo.com", "bing.com", "mapquest.com", "yellowpages.com", "tattoshopsnearme.com", "bit.ly", "etsy.com",
]
const GOOGLE = /(^|\.)google\.[a-z.]+$|(^|\.)goo\.gl$|(^|\.)g\.page$|(^|\.)business\.site$/

export function hostOf(raw: string): string | null {
  try {
    const s = raw.trim()
    return new URL(/^https?:\/\//i.test(s) ? s : `http://${s}`).hostname.toLowerCase().replace(/^www\d?\./, "").replace(/\.$/, "")
  } catch {
    return null
  }
}

/** Why a website isn't crawled, or null if it's the shop's own site. */
export function excludedReason(host: string): string | null {
  if (!host.includes(".")) return "not a web address"
  if (GOOGLE.test(host)) return "google"
  for (const h of EXCLUDED_HOSTS) if (host === h || host.endsWith(`.${h}`)) return h
  return null
}

/** Site key: host without www, path without trailing slash, no query or hash. */
export function siteKey(raw: string): string | null {
  const s = raw.trim()
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `http://${s}`)
    const host = u.hostname.toLowerCase().replace(/^www\d?\./, "").replace(/\.$/, "")
    if (!host.includes(".") || /\s/.test(host)) return null
    return host + u.pathname.replace(/\/+$/, "").replace(/\/index\.(html?|php)$/i, "")
  } catch {
    return null
  }
}

/**
 * The domain names the shop: "atomictattoos.com" and "Atomic Tattoos Tampa",
 * "717tattoo.com" and "717 Tattoo, Body Piercing …". The domain's first label,
 * minus a trailing tattoo/studio/ink word, inside the shop's name (or the
 * other way round), or the two names agree.
 */
export function domainMatchesName(host: string, name: string, city: string | null): boolean {
  const label = host.split(".").slice(0, -1).join("").replace(/^(www|m)\d?/, "")
  const core = label.replace(/(tattoos?|tattooing|studios?|ink|gallery|parlou?r|co|llc)+$/, "")
  const key = nameKey(name)
  if (core.length >= 3 && (key.includes(core) || core.includes(key.replace(/(tattoos?|studios?|ink|co|llc)+$/, "")) && key.length >= 4)) return true
  return namesAgree(label, name, [city]) !== null
}

/** How much a handle looks like the shop's name, 0..1. */
export function handleScore(handle: string, shops: { name: string; city: string | null }[]): number {
  const h = nameKey(handle)
  if (!h) return 0
  let best = 0
  for (const s of shops) {
    const full = nameKey(s.name)
    const core = coreName(s.name, [s.city])
    for (const target of [full, core]) {
      if (!target) continue
      let sc = similarity(h, target)
      const [short, long] = h.length <= target.length ? [h, target] : [target, h]
      if (short.length >= 3 && long.includes(short)) sc = Math.max(sc, 0.8)
      best = Math.max(best, sc)
    }
  }
  return Math.round(best * 100) / 100
}

export interface ScopeShop {
  id: string
  name: string
  city: string | null
  state: string | null
  website: string
}
export interface ScopeSite {
  key: string
  url: string
  shops: ScopeShop[]
}
export interface Scope {
  built_at: string
  sites: ScopeSite[]
  excluded: Record<string, number>
  directory_hosts: { host: string; shops: number }[]
}

/**
 * Sites to crawl: active shops whose website is their own site. Shops whose
 * website is Instagram or Facebook (Part A) and link-in-bio or booking hosts are
 * left out, and so are "directory" hosts: one host on 3+ shops whose names
 * neither agree with each other nor (for most of them) with the domain name
 * (directories and spam domains; a chain's shared host stays in).
 */
export function buildScope(shops: { id: string; name: string; city: string | null; state: string | null; website: string | null }[]): Scope {
  const excluded: Record<string, number> = {}
  const bump = (k: string) => (excluded[k] = (excluded[k] ?? 0) + 1)
  const byHost = new Map<string, ScopeShop[]>()
  const keep: { shop: ScopeShop; key: string; host: string }[] = []
  for (const s of shops) {
    const website = (s.website ?? "").trim()
    if (!website) continue
    if (socialHost(website) === "instagram" || socialHost(website) === "facebook") {
      bump("website is Instagram or Facebook (Part A)")
      continue
    }
    const host = hostOf(website)
    const key = siteKey(website)
    if (!host || !key) {
      bump("not a web address")
      continue
    }
    const why = excludedReason(host)
    if (why) {
      bump(`link-in-bio, booking, social or directory host (${why === "not a web address" ? why : "listed"})`)
      continue
    }
    const shop = { id: s.id, name: s.name, city: s.city, state: s.state, website }
    byHost.set(host, [...(byHost.get(host) ?? []), shop])
    keep.push({ shop, key, host })
  }
  const directory = new Set<string>()
  const directoryHosts: { host: string; shops: number }[] = []
  for (const [host, list] of byHost) {
    if (list.length < 3) continue
    // A chain: most shops are named like the domain ("atomictattoos.com" →
    // "Atomic Tattoos Tampa"), or all share one name.
    const likeDomain = list.filter((s) => domainMatchesName(host, s.name, s.city)).length
    const sameName = list.every((s) => namesAgree(s.name, list[0].name, [s.city, list[0].city]) !== null)
    if (!sameName && likeDomain * 2 < list.length) {
      directory.add(host)
      directoryHosts.push({ host, shops: list.length })
    }
  }
  const sites = new Map<string, ScopeSite>()
  for (const { shop, key, host } of keep) {
    if (directory.has(host)) {
      bump("directory or spam host (one host, 3+ unrelated shops)")
      continue
    }
    const site = sites.get(key) ?? { key, url: shop.website, shops: [] }
    site.shops.push(shop)
    sites.set(key, site)
  }
  return {
    built_at: new Date().toISOString(),
    sites: Array.from(sites.values()).sort((a, b) => a.key.localeCompare(b.key)),
    excluded,
    directory_hosts: directoryHosts.sort((a, b) => b.shops - a.shops),
  }
}

// ---- cached site record -------------------------------------------------------

export type FetchOutcome =
  | { kind: "ok"; status: number; url: string; final_url: string; redirects: number; content_type: string; html: string | null; truncated: boolean }
  | { kind: "http"; status: number; url: string; final_url: string; redirects: number }
  | { kind: "net"; code: string; url: string; final_url: string; redirects: number }

export interface SiteRecord {
  key: string
  url: string
  checked_at: string
  robots: "allowed" | "disallowed" | "none"
  /** Homepage outcome (after https → http fallback). */
  home: FetchOutcome | null
  /** Extra internal pages (contact, about, artists, team). */
  pages: { reason: string; outcome: FetchOutcome }[]
  skipped_by_robots: number
}

export function sitePath(key: string): string {
  return path.join(SITES_DIR, `${createHash("sha1").update(key).digest("hex")}.json.gz`)
}
export function readSite(key: string): SiteRecord | null {
  const f = sitePath(key)
  return fs.existsSync(f) ? (JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString("utf-8")) as SiteRecord) : null
}
export function writeSite(rec: SiteRecord): void {
  fs.mkdirSync(SITES_DIR, { recursive: true })
  const tmp = `${sitePath(rec.key)}.tmp`
  fs.writeFileSync(tmp, zlib.gzipSync(JSON.stringify(rec)))
  fs.renameSync(tmp, sitePath(rec.key))
}

// ---- website status ------------------------------------------------------------

export type WebsiteStatus = "ok" | "redirected_to_other_domain" | "not_found" | "dead" | "parked" | "error"

const PARKED_HOSTS = /(^|\.)(sedo\.com|sedoparking\.com|dan\.com|afternic\.com|hugedomains\.com|parkingcrew\.net|bodis\.com|above\.com|undeveloped\.com|uniregistry\.com|domainmarket\.com|buydomains\.com|parklogic\.com|domainnamesales\.com|atom\.com|squadhelp\.com|brandbucket\.com|namecheap\.com|domains\.atom\.com|sav\.com|spaceship\.com|porkbun\.com)$/
const PARKED_TEXT = [
  /this domain (name )?(is|may be) for sale/i,
  /buy this domain/i,
  /domain (name )?is for sale/i,
  /the domain [\w.-]+ is for sale/i,
  /this domain has (recently )?(been registered|expired)/i,
  /domain (has )?expired/i,
  /this (web ?site|domain) (is|has been) parked/i,
  /parked (free|domain|courtesy)/i,
  /sedoparking|parkingcrew|bodis\.com|domainparking|parklogic/i,
  /future home of something quite cool/i,
  /hugedomains\.com|afternic\.com|dan\.com\/buy|godaddy\.com\/domainsearch/i,
  /is available for purchase/i,
  /make an offer on this domain/i,
  /inquire about this domain/i,
]

export const bareHost = (u: string) => {
  try {
    return new URL(u).hostname.toLowerCase().replace(/^www\d?\./, "")
  } catch {
    return ""
  }
}

// Domain-sale landing pages served on the shop's own domain (DomainMarket's
// "RitualInk.com is more than just a domain name"): one hit is enough.
const PARKED_STRONG = /"name"\s*:\s*"DomainMarket\.com"|is more than just a domain name|this premium domain|hugedomains\.com\/domain_profile/i

/** Parked-page check: two for-sale phrases, or one on a short page. */
export function looksParked(html: string, finalUrl: string): boolean {
  if (PARKED_HOSTS.test(bareHost(finalUrl)) || PARKED_STRONG.test(html)) return true
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")
  const hits = PARKED_TEXT.filter((re) => re.test(text)).length
  return hits >= 2 || (hits === 1 && text.length < 3000)
}

export function websiteStatus(rec: SiteRecord): { status: WebsiteStatus; detail: string } {
  const h = rec.home
  if (!h) return { status: "error", detail: rec.robots === "disallowed" ? "robots.txt disallows the homepage" : "not fetched" }
  if (PARKED_HOSTS.test(bareHost(h.final_url))) return { status: "parked", detail: bareHost(h.final_url) }
  if (h.kind === "net") {
    if (/ENOTFOUND|ECONNREFUSED|EAI_NONAME|ENODATA|EHOSTUNREACH|ENETUNREACH/.test(h.code)) return { status: "dead", detail: h.code }
    return { status: "error", detail: h.code }
  }
  if (h.kind === "http") {
    if (h.status === 404 || h.status === 410) return { status: "not_found", detail: String(h.status) }
    return { status: "error", detail: `http ${h.status}` }
  }
  if (PARKED_HOSTS.test(bareHost(h.final_url)) || (h.html && looksParked(h.html, h.final_url))) return { status: "parked", detail: bareHost(h.final_url) }
  const from = bareHost(h.url)
  const to = bareHost(h.final_url)
  if (from && to && from !== to) return { status: "redirected_to_other_domain", detail: to }
  return { status: "ok", detail: "" }
}
