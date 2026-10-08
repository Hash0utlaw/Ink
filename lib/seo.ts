import { SITE_URL } from "@/lib/site-config"

/** Absolute canonical URL on SITE_URL for a site path ("/shops/123"). */
export function canonicalUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

/** Collapses whitespace and trims to `max` characters on a word boundary, adding "…" when cut. */
export function metaDescription(text: string, max = 160): string {
  const s = text.replace(/\s+/g, " ").trim()
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1)
  const space = cut.lastIndexOf(" ")
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:—-]+$/, "")}…`
}

/** Drops keys whose value is undefined, null, "" or an empty object, recursively. */
export function withoutEmpty<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutEmpty).filter((v) => !isEmpty(v)) as T
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      const cleaned = withoutEmpty(v)
      if (!isEmpty(cleaned)) out[k] = cleaned
    }
    return out as T
  }
  return value
}

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true
  if (typeof v === "string") return v.trim() === ""
  if (typeof v === "number") return !Number.isFinite(v)
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === "object") return Object.keys(v as object).filter((k) => k !== "@type").length === 0
  return false
}

/** JSON for a <script type="application/ld+json">, with "<" escaped so text can't close the tag. */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
