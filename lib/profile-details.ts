// "Profile details" in the artist dashboard (Round 12): validation for
// PATCH /api/artist/profile and the booking and price lines shown on the
// artist's public page. No server-only imports, so the dashboard form uses it too.

import { cleanHandle } from "@/lib/socials"
import { isStyleSlug, sortStyleSlugs } from "@/lib/styles"

export type AcceptingClients = "yes" | "waitlist" | "no"

export const ACCEPTING_OPTIONS: { value: AcceptingClients; label: string }[] = [
  { value: "yes", label: "Yes, taking new clients" },
  { value: "waitlist", label: "Waitlist only" },
  { value: "no", label: "Not right now" },
]

export const LIMITS = {
  nameMin: 2,
  nameMax: 60,
  bio: 600,
  pricingNotes: 200,
  styles: 5,
  price: 10_000,
  url: 300,
} as const

/** What the form sends. "website" is stored as artists.website_url. */
export interface ProfileDetailsInput {
  display_name: string
  bio: string
  styles: string[]
  instagram_handle: string
  tiktok_handle: string
  website: string
  booking_url: string
  accepting_clients: AcceptingClients
  shop_minimum: number | null
  hourly_rate_min: number | null
  hourly_rate_max: number | null
  pricing_notes: string
}

export const PROFILE_FIELDS = [
  "display_name",
  "bio",
  "styles",
  "instagram_handle",
  "tiktok_handle",
  "website",
  "booking_url",
  "accepting_clients",
  "shop_minimum",
  "hourly_rate_min",
  "hourly_rate_max",
  "pricing_notes",
] as const satisfies readonly (keyof ProfileDetailsInput)[]

export type ProfileField = (typeof PROFILE_FIELDS)[number]

export function isAcceptingClients(x: unknown): x is AcceptingClients {
  return x === "yes" || x === "waitlist" || x === "no"
}

/** Trimmed text with HTML tags and control characters removed (newlines kept). */
export function plainText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
}

/**
 * An https web address: "kamil.com" becomes "https://kamil.com/". null for
 * empty input, undefined when it isn't a normal web address (javascript:,
 * data:, mailto:, no dot in the host, spaces, credentials, a port).
 */
export function httpsUrl(raw: string): string | null | undefined {
  const s = raw.trim()
  if (!s) return null
  if (s.length > LIMITS.url || /\s/.test(s)) return undefined
  // Any scheme other than http(s) is refused rather than prefixed.
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:\/\//i.test(s)) return undefined
  try {
    const url = new URL(/^https?:\/\//i.test(s) ? s.replace(/^http:/i, "https:") : `https://${s}`)
    if (url.protocol !== "https:" || url.username || url.password || url.port) return undefined
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(url.hostname)) return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

/** A whole number of dollars 0 to 10,000; null when empty; undefined when invalid. */
function price(raw: unknown): number | null | undefined {
  if (raw == null || raw === "") return null
  const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\s*\d+\s*$/.test(raw) ? Number(raw) : NaN
  return Number.isInteger(n) && n >= 0 && n <= LIMITS.price ? n : undefined
}

/** A handle from "@name", "name" or a profile URL; "" when empty; undefined when it isn't one. */
function handle(network: "instagram" | "tiktok", raw: string): string | undefined {
  if (!raw.trim()) return ""
  return cleanHandle(network, raw) ?? undefined
}

export type FieldErrors = Partial<Record<ProfileField, string>>

/** Column values for artists, keyed by column name. Only the fields that were sent. */
export type ProfilePatch = Record<string, string | number | string[] | null>

/**
 * Validates the fields present in `body` (others are ignored, as is anything
 * not in PROFILE_FIELDS). Returns the column patch, or the errors by field.
 */
export function validateProfileDetails(
  body: Record<string, unknown>,
): { patch: ProfilePatch; errors: null } | { patch: null; errors: FieldErrors } {
  const errors: FieldErrors = {}
  const patch: ProfilePatch = {}
  const has = (k: ProfileField) => Object.prototype.hasOwnProperty.call(body, k)
  const text = (k: ProfileField): string | undefined => {
    const v = body[k]
    if (v == null) return ""
    return typeof v === "string" ? plainText(v) : undefined
  }

  if (has("display_name")) {
    const v = text("display_name")?.replace(/\s+/g, " ")
    if (v === undefined || v.length < LIMITS.nameMin || v.length > LIMITS.nameMax) {
      errors.display_name = `Use ${LIMITS.nameMin} to ${LIMITS.nameMax} characters.`
    } else patch.display_name = v
  }

  if (has("bio")) {
    const v = text("bio")
    if (v === undefined || v.length > LIMITS.bio) errors.bio = `Keep it to ${LIMITS.bio} characters.`
    else patch.bio = v || null
  }

  if (has("pricing_notes")) {
    const v = text("pricing_notes")?.replace(/\s+/g, " ")
    if (v === undefined || v.length > LIMITS.pricingNotes) errors.pricing_notes = `Keep it to ${LIMITS.pricingNotes} characters.`
    else patch.pricing_notes = v || null
  }

  if (has("styles")) {
    const v = body.styles
    if (!Array.isArray(v) || !v.every(isStyleSlug)) errors.styles = "Pick styles from the list."
    else {
      const slugs = sortStyleSlugs(v)
      if (slugs.length > LIMITS.styles) errors.styles = `Pick up to ${LIMITS.styles} styles.`
      else patch.styles = slugs
    }
  }

  for (const [field, network] of [
    ["instagram_handle", "instagram"],
    ["tiktok_handle", "tiktok"],
  ] as const) {
    if (!has(field)) continue
    const raw = text(field)
    const v = raw === undefined ? undefined : handle(network, raw)
    if (v === undefined) errors[field] = "Use letters, numbers, dots and underscores only."
    else patch[field] = v || null
  }

  for (const [field, column] of [
    ["website", "website_url"],
    ["booking_url", "booking_url"],
  ] as const) {
    if (!has(field)) continue
    const raw = body[field]
    const v = raw == null ? null : typeof raw === "string" ? httpsUrl(raw) : undefined
    if (v === undefined) errors[field] = "Enter a web address, like yourname.com."
    else patch[column] = v
  }

  if (has("accepting_clients")) {
    if (!isAcceptingClients(body.accepting_clients)) errors.accepting_clients = "Pick one."
    else patch.accepting_clients = body.accepting_clients
  }

  for (const field of ["shop_minimum", "hourly_rate_min", "hourly_rate_max"] as const) {
    if (!has(field)) continue
    const v = price(body[field])
    if (v === undefined) errors[field] = `A whole number from 0 to ${LIMITS.price.toLocaleString("en-US")}.`
    else patch[field] = v
  }
  const min = patch.hourly_rate_min
  const max = patch.hourly_rate_max
  if (typeof min === "number" && typeof max === "number" && min > max && !errors.hourly_rate_max) {
    errors.hourly_rate_max = "Must be at least your starting rate."
  }

  return Object.keys(errors).length > 0 ? { patch: null, errors } : { patch, errors: null }
}

const dollars = (n: number) => `$${n.toLocaleString("en-US")}`

/** "Taking new clients", "Waitlist only" or "Not taking new clients right now". */
export function acceptingLabel(value: AcceptingClients): string {
  return value === "yes" ? "Taking new clients" : value === "waitlist" ? "Waitlist only" : "Not taking new clients right now"
}

/** "Minimum $100, $150 to $200 an hour." or "" when no prices are set. */
export function priceLine(p: {
  shopMinimum: number | null
  hourlyRateMin: number | null
  hourlyRateMax: number | null
}): string {
  const parts: string[] = []
  if (p.shopMinimum != null) parts.push(`Minimum ${dollars(p.shopMinimum)}`)
  const { hourlyRateMin: lo, hourlyRateMax: hi } = p
  if (lo != null && hi != null) parts.push(lo === hi ? `${dollars(lo)} an hour` : `${dollars(lo)} to ${dollars(hi)} an hour`)
  else if (lo != null) parts.push(`from ${dollars(lo)} an hour`)
  else if (hi != null) parts.push(`up to ${dollars(hi)} an hour`)
  if (parts.length === 0) return ""
  const line = parts.join(", ")
  return `${line.charAt(0).toUpperCase()}${line.slice(1)}.`
}

/** schema.org priceRange: the price line without its full stop ("Minimum $100, $150 to $200 an hour"); undefined when no prices are set. */
export function schemaPriceRange(p: {
  shopMinimum: number | null
  hourlyRateMin: number | null
  hourlyRateMax: number | null
}): string | undefined {
  return priceLine(p).replace(/\.$/, "") || undefined
}

/** The finder card's one line: "Taking new clients" or "Waitlist", only once claimed (the artist set it). No prices on cards. */
export function cardBookingLine(a: { isClaimed: boolean; acceptingClients: AcceptingClients }): string | null {
  if (!a.isClaimed) return null
  return a.acceptingClients === "yes" ? "Taking new clients" : a.acceptingClients === "waitlist" ? "Waitlist" : null
}
