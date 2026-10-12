/**
 * Up to two initials from a name: the first letter or digit of the first two
 * words that have one, uppercased. Punctuation is skipped, so "'Dinero'
 * Christian" gives "DC", "(Private Studio)" gives "PS" and "_ogslowdeath_" "O".
 */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.match(/[\p{L}\p{N}]/u)?.[0])
    .filter((c): c is string => !!c)
    .slice(0, 2)
    .map((c) => c.toUpperCase())
    .join("")
}
