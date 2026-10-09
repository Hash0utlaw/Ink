// No server imports: safe for client components (lib/map-data re-exports it).

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * "street, City, ST zip" for the map list and card. A stored address that
 * already names the city (after a comma) or ends in a ZIP is shown as is.
 */
export function formatMapAddress(street: unknown, city: unknown, state: unknown, zip: unknown): string {
  const [st, c, s, z] = [street, city, state, zip].map((v) => String(v ?? "").trim())
  if (st && (/\b\d{5}(?:-\d{4})?(?:,?\s*(?:USA|United States))?$/i.test(st) || (c && new RegExp(`,\\s*${escapeRegExp(c)}\\b`, "i").test(st)))) {
    return st
  }
  return [st, c, [s, z].filter(Boolean).join(" ")].filter(Boolean).join(", ")
}
