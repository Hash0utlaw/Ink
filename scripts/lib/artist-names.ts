// scripts/lib/artist-names.ts
// Artist-name helpers shared by scrape-shop-artists.ts and
// promote-shop-artists.ts.

export const PLACEHOLDER_NAMES = new Set([
  "artist",
  "staff",
  "guest",
  "tattoo artist",
  "resident artist",
  "shop artist",
  "tbd",
  "n/a",
  "na",
  "unknown",
  "coming soon",
])

export function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name) return true
  const trimmed = name.trim()
  if (trimmed.length < 2) return true
  return PLACEHOLDER_NAMES.has(trimmed.toLowerCase())
}

// Lowercase, accents stripped, punctuation → single spaces:
// "José  O'Neil-Smith" → "jose o neil smith". Used both to dedupe names and to
// check that a name actually appears in a page's text.
export function normalizeArtistName(s: string | null | undefined): string {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}
