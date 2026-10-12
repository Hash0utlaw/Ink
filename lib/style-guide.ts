import type { StyleSlug } from "@/lib/styles"

/**
 * Style guide pages (/styles/[slug], app/styles/page.tsx ALL_STYLES) that are
 * the SAME style as a master style (lib/styles.ts). Only these show the master
 * style's symbol, a real artist count and an artist list. Guide pages that are
 * only close to a master style (mandala ~ ornamental, minimalist ~ fine line,
 * botanical ~ floral, surrealism ~ illustrative) or have none (biomechanical)
 * are left out on purpose.
 */
const EXACT_MASTER_SLUG: Record<string, StyleSlug> = {
  realism: "realism",
  "black-grey": "black-and-grey",
  traditional: "traditional",
  "neo-traditional": "neo-traditional",
  japanese: "japanese",
  tribal: "tribal",
  geometric: "geometric",
  dotwork: "dotwork",
  blackwork: "blackwork",
  ornamental: "ornamental",
  "fine-line": "fine-line",
  script: "lettering",
  watercolor: "watercolor",
  illustrative: "illustrative",
}

/** The master style a guide page is exactly the same as, or null. */
export function exactMasterSlug(guideSlug: string): StyleSlug | null {
  return EXACT_MASTER_SLUG[guideSlug] ?? null
}
