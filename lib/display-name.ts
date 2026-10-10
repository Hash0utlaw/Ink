// Display only: names are stored as scraped; this tidies how they read on the page.

const SUFFIXES: [RegExp, string][] = [
  [/^l\.?\s?l\.?\s?c\.?$/i, "LLC"],
  [/^inc\.?$/i, "Inc."],
  [/^co\.?$/i, "Co."],
  [/^ltd\.?$/i, "Ltd."],
]

/**
 * A business suffix at the end of a name in its usual form:
 * "Black Cloud Tattoo llc" → "Black Cloud Tattoo LLC", "L.L.C" → "LLC",
 * "inc" → "Inc.", "co" → "Co.", "ltd" → "Ltd.". Nothing else changes case.
 */
export function displayName(name: string | null | undefined): string {
  const text = String(name ?? "").trim()
  const match = text.match(/^(.*?[\s,]+)(\S+)$/)
  if (!match) return text
  const [, head, last] = match
  for (const [pattern, suffix] of SUFFIXES) {
    if (pattern.test(last)) return `${head}${suffix}`
  }
  return text
}
