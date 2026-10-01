// scripts/lib/non-tattoo.ts
// Name filter for businesses that aren't tattoo studios (supply stores,
// brow/lash bars, salons…). Shared by flag-non-tattoo.ts (report on existing
// shops) and overture/fetch.ts (drop rows before they're ever imported).

// Flagged even when the name says "tattoo" (e.g. "Tattoo Supply Co").
const ALWAYS = /\bsupply\b|\bsupplies\b/i
// Flagged only when the name doesn't contain "tattoo". Short words use \b so
// "Sacred Space Tattoo" doesn't match \bspa\b and "Brownstone" doesn't match \bbrows?\b.
const UNLESS_TATTOO =
  /microblad|permanent makeup|\bbrows?\b|\blash(es)?\b|cosmetic|\bsalon\b|\bnails?\b|\bvape\b|\bsmoke\b|\blaser\b|removal|\bbarber|med ?spa|\bspa\b/i

// The matched term (lowercased), or null if the name looks like a tattoo shop.
export function nonTattooTerm(name: unknown): string | null {
  const s = String(name ?? "")
  const m = s.match(ALWAYS) ?? (/tattoo/i.test(s) ? null : s.match(UNLESS_TATTOO))
  return m ? m[0].toLowerCase() : null
}
