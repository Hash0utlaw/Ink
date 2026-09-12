// scripts/lib/address-normalize.ts
// Strips trailing unit designators (suite/ste/unit/apt/#/bldg/floor/fl, plus
// a bare trailing letter token like "...107th Ave c") from a street address
// before it's sent to the Census geocoder. Real rows in `shops.address` that
// motivated this: "1117 W Manchester Blvd suite r", "6000 Universal Blvd
// #745a", "111 107th Ave c", "600 W 28th St #104a" — Census's exact-match
// pass chokes on these; without the unit token it usually resolves fine.
//
// This ONLY affects the string submitted to Census — the database's
// `address` column is never touched.

const UNIT_KEYWORD_RE =
  /\s+(?:suite|ste|unit|apt|apartment|bldg|building|floor|fl)\.?\s*#?\s*[a-z0-9-]*\s*$/i
const HASH_UNIT_RE = /\s*#\s*[a-z0-9-]+\s*$/i
const TRAILING_BARE_LETTER_RE = /\s+[a-z]\s*$/i

export function normalizeAddressForGeocoding(address: string): string {
  let result = address.trim()

  let changed = true
  while (changed) {
    changed = false
    const afterHash = result.replace(HASH_UNIT_RE, "").trim()
    if (afterHash !== result) {
      result = afterHash
      changed = true
      continue
    }
    const afterKeyword = result.replace(UNIT_KEYWORD_RE, "").trim()
    if (afterKeyword !== result) {
      result = afterKeyword
      changed = true
      continue
    }
  }

  const withoutBareLetter = result.replace(TRAILING_BARE_LETTER_RE, "").trim()
  if (withoutBareLetter.length > 0 && withoutBareLetter !== result) {
    result = withoutBareLetter
  }

  return result
}
