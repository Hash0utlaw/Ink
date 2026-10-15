// scripts/tw/lib/names.ts
// Name rules shared by scripts/tw/import.ts and scripts/socials/import.ts:
// the "names agree" check, display-name cleaning and the "name--shop-slug" handle.

import { similarity } from "../../lib/cleanup-utils"
import { nameKey, normCity, normName } from "./normalize"

export const NAME_MIN = 0.6

export const NAME_STOP = new Set([
  "tattoo", "tattoos", "tattooing", "tattooer", "studio", "studios", "co", "company", "llc", "inc", "and",
  "parlor", "parlour", "parlors", "shop", "shoppe", "shops", "the",
])

/** Name with generic words and the city name removed, no spaces. */
export function coreName(name: string, cities: (string | null)[]): string {
  let s = ` ${normName(name)} `
  for (const c of cities) {
    for (const form of new Set([normName(c), normCity(c)])) if (form) s = s.split(` ${form} `).join(" ")
  }
  return s.split(" ").filter((t) => t && !NAME_STOP.has(t)).join("")
}

/** "Tattoo", "Las Vegas Tattoo Artist": nothing left once generic words and the city go. */
export function isGenericName(name: string, cities: (string | null)[]): boolean {
  const ARTIST_WORDS = new Set(["artist", "artists", "tattooist", "custom", "by"])
  let s = ` ${normName(name)} `
  for (const c of cities) for (const form of new Set([normName(c), normCity(c)])) if (form) s = s.split(` ${form} `).join(" ")
  return s.split(" ").filter((t) => t && !NAME_STOP.has(t) && !ARTIST_WORDS.has(t)).length === 0
}

// Our shop is a supplier rather than a studio.
export const SUPPLY_SHOP = /\b(suppl(y|ies)|products?|equipment|wholesale|distribut\w*|manufactur\w*)\b/i
// Letters outside the Latin script ("ᏴOᏞO" uses Cherokee lookalikes).
export const UNREADABLE = /(?=\p{L})\P{Script=Latin}/u

/**
 * Display name for a new artist: fancy Unicode letters ("𝐀𝐃𝐀𝐌") → plain,
 * emoji and decorative symbols removed, ALL-CAPS → Title Case. Names with any
 * lowercase letter keep their casing.
 */
export function cleanName(raw: string): string {
  // Symbols first, so NFKC doesn't turn "™" into "TM".
  let s = raw.replace(/[\p{Extended_Pictographic}\p{So}\p{Sk}\p{Co}\u200d\ufe0e\ufe0f\u20e3]/gu, " ").normalize("NFKC")
  s = s.replace(/[|•·∘⋰⋱✧*~_=<>^#@[\]{}]+/g, " ")
  s = s.split(" ").filter((t) => !/^[.,:;]+$/.test(t)).join(" ")
  s = s.replace(/\s+/g, " ").trim().replace(/^[\s.,:;!?'"()-]+|[\s,:;!?(-]+$/g, "").trim()
  if (/\p{Lu}/u.test(s) && !/\p{Ll}/u.test(s)) {
    s = s.toLowerCase().replace(/(^|[\s\-'.(/"“])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase())
  }
  return s
}

/** Step 2's name check. Returns the similarity it found, or null if they don't agree. */
export function namesAgree(a: string | null, b: string | null, cities: (string | null)[]): number | null {
  if (!a || !b) return null
  let ca = coreName(a, cities)
  let cb = coreName(b, cities)
  // A name that is only generic words ("Tattoo Studio") compares whole.
  if (!ca || !cb) {
    ca = nameKey(a)
    cb = nameKey(b)
    return ca && ca === cb ? 1 : null
  }
  const sim = similarity(ca, cb)
  if (sim >= NAME_MIN) return sim
  const [short, long] = ca.length <= cb.length ? [ca, cb] : [cb, ca]
  return short.length >= 3 && long.includes(short) ? sim : null
}

function slugPart(s: string): string {
  return stripToSlug(s.normalize("NFKD").replace(/[̀-ͯ]/g, ""))
}
function stripToSlug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
}
/** "name--shop-slug", same as promote-shop-artists.ts; a number is added if taken. */
export function makeHandle(name: string, ig: string | null, shop: { id: string; slug: string | null }, taken: Set<string>): string {
  const namePart = slugPart(name) || stripToSlug((ig ?? "").replace(/[._]/g, "-")) || "artist"
  const shopPart = (shop.slug ?? shop.id).toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-")
  const base = `${namePart}--${shopPart}`
  let h = base
  for (let n = 2; taken.has(h); n++) h = `${base}-${n}`
  taken.add(h)
  return h
}
