const EMAIL_RE = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/

export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 320 && EMAIL_RE.test(value.trim())
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

/** ISO timestamp for `hours` ago — used for per-email rate limits. */
export function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

/** Length caps for text from the public forms. */
export const MAX = {
  name: 200,
  phone: 40,
  short: 100, // size, placement, style, budget, reason, Instagram handle
  listing: 300,
  message: 5000,
  review: 2000,
} as const

/**
 * Optional text field: trimmed, null when missing or empty. Returns undefined
 * when the value isn't text or is longer than `max`, so the caller can reject it.
 */
export function optionalText(value: unknown, max: number): string | null | undefined {
  if (value == null) return null
  if (typeof value !== "string") return undefined
  const text = value.trim()
  if (text.length > max) return undefined
  return text || null
}

/** Required text field: like optionalText, but empty is invalid too. */
export function requiredText(value: unknown, max: number): string | undefined {
  return optionalText(value, max) ?? undefined
}

/** A YYYY-MM-DD date, null when missing or empty; undefined when malformed. */
export function optionalDate(value: unknown): string | null | undefined {
  if (value == null || value === "") return null
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : undefined
}

/** Name of the hidden field in every public form. People never see it; bots fill it in. */
export const HONEYPOT_FIELD = "hp"

/** True when the hidden honeypot field came back filled in. */
export function isBot(body: unknown): boolean {
  const value = (body as Record<string, unknown> | null)?.[HONEYPOT_FIELD]
  return typeof value === "string" && value.trim().length > 0
}
