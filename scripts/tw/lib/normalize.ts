// scripts/tw/lib/normalize.ts
// Name, place, phone, domain and Instagram-handle normalization shared by
// scripts/tw/match.ts and scripts/tw/import.ts.

import { instagramHandle } from "./parse"

export const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "")

/** lowercase, no accents, punctuation → space, collapsed. */
export function normName(raw: unknown): string {
  return stripAccents(String(raw ?? ""))
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}
/** Exact-match key: normName without spaces ("Ink & Iron" = "ink&iron"). */
export const nameKey = (raw: unknown) => normName(raw).replace(/ /g, "")

export function normCity(raw: unknown): string {
  return normName(String(raw ?? "").replace(/^\s*city of\s+/i, ""))
    .replace(/^st\b/, "saint")
    .replace(/\bst\b(?= )/g, "saint")
    .trim()
}
export const normState = (raw: unknown) => String(raw ?? "").trim().toUpperCase()
export const placeKey = (city: unknown, state: unknown) => `${normCity(city)}|${normState(state)}`

export const normPhone = (raw: unknown): string | null => {
  let d = String(raw ?? "").replace(/\D/g, "")
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1)
  return d.length === 10 ? d : null
}

// Link-in-bio, social and booking platforms: one domain is shared by many
// businesses, so a domain match there means nothing.
export const SHARED_DOMAINS = new Set([
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
export const JUNK_HANDLES = new Set(["instagram", "instagram.com", "www.instagram.com", "ig", "insta", "none", "n/a", "na", "null", "facebook", "tiktok"])
export function dbHandle(raw: unknown): string | null {
  const s = String(raw ?? "").trim()
  if (!s || JUNK_HANDLES.has(s.toLowerCase())) return null
  const h = instagramHandle(s)
  return h && !JUNK_HANDLES.has(h) && h.length >= 2 ? h : null
}

