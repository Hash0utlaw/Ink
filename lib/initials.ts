const QUOTES = /['"‘’“”`]/g

/**
 * Up to two initials from a name: the first letter of the first two words,
 * uppercased. Quote marks are ignored, so "'Dinero' Christian" gives "DC".
 */
export function initials(name: string): string {
  return name
    .replace(QUOTES, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")
}
