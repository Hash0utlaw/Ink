import type { ReactNode } from "react"
import type { StyleSlug } from "@/lib/styles"

// Shapes are copied from docs/design/brand-pieces-reference.html (viewBox 0 0 16 16).
// Colors come from the theme tokens through Tailwind fill/stroke classes.
const DIAMOND = "M8 1 L15 8 L8 15 L1 8 Z"
const TRIANGLE = "M8 1.5 L15 14.5 L1 14.5 Z"

const SYMBOLS: Record<StyleSlug, ReactNode> = {
  "black-and-grey": (
    <>
      <circle cx="8" cy="8" r="6.5" className="fill-vellum stroke-ink" strokeWidth="1.5" />
      <path d="M8 1.5 A6.5 6.5 0 0 0 8 14.5 Z" className="fill-ink" />
    </>
  ),
  realism: <rect x="2" y="2" width="12" height="12" className="fill-ink" />,
  traditional: <path d={DIAMOND} className="fill-flash-red stroke-ink" strokeWidth="1.5" />,
  "fine-line": <circle cx="8" cy="8" r="6" fill="none" className="stroke-ink" strokeWidth="1.5" />,
  illustrative: (
    <path d={TRIANGLE} className="fill-flash-yellow stroke-ink" strokeWidth="1.5" strokeLinejoin="round" />
  ),
  color: (
    <>
      <circle cx="8" cy="8" r="6.5" className="fill-flash-yellow stroke-ink" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2.6" className="fill-flash-red" />
    </>
  ),
  "neo-traditional": <path d={DIAMOND} className="fill-bottle-green stroke-ink" strokeWidth="1.5" />,
  blackwork: <circle cx="8" cy="8" r="6.5" className="fill-ink" />,
  floral: <path d={TRIANGLE} className="fill-bottle-green stroke-ink" strokeWidth="1.5" strokeLinejoin="round" />,
  japanese: <circle cx="8" cy="8" r="6.5" className="fill-navy stroke-ink" strokeWidth="1.5" />,
  portrait: <rect x="2" y="2" width="12" height="12" className="fill-navy stroke-ink" strokeWidth="1.5" />,
  anime: <path d={TRIANGLE} className="fill-flash-red stroke-ink" strokeWidth="1.5" strokeLinejoin="round" />,
  "cover-ups": <rect x="2.5" y="2.5" width="11" height="11" fill="none" className="stroke-ink" strokeWidth="1.5" />,
  geometric: <path d={TRIANGLE} fill="none" className="stroke-ink" strokeWidth="1.5" strokeLinejoin="round" />,
  lettering: <path d={TRIANGLE} className="fill-ink stroke-ink" strokeWidth="1.5" strokeLinejoin="round" />,
  ornamental: <path d={DIAMOND} className="fill-flash-yellow stroke-ink" strokeWidth="1.5" />,
  "new-school": <circle cx="8" cy="8" r="6.5" className="fill-flash-red stroke-ink" strokeWidth="1.5" />,
  tribal: <path d={DIAMOND} className="fill-ink" />,
  watercolor: <path d={TRIANGLE} className="fill-navy stroke-ink" strokeWidth="1.5" strokeLinejoin="round" />,
  dotwork: (
    <>
      <circle cx="8" cy="8" r="6" fill="none" className="stroke-ink" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2" className="fill-ink" />
    </>
  ),
  chicano: <path d={DIAMOND} className="fill-navy stroke-ink" strokeWidth="1.5" />,
}

const INK = "hsl(var(--ink))"
const FLASH_RED = "hsl(var(--flash-red))"
const FLASH_YELLOW = "hsl(var(--flash-yellow))"
const BOTTLE_GREEN = "hsl(var(--bottle-green))"
const NAVY = "hsl(var(--navy))"

/** Plate bottom-edge color for each style (SKILL.md "Style symbols" table). */
export const STYLE_EDGE_COLOR: Record<StyleSlug, string> = {
  "black-and-grey": INK,
  realism: INK,
  traditional: FLASH_RED,
  "fine-line": INK,
  illustrative: FLASH_YELLOW,
  color: FLASH_RED,
  "neo-traditional": BOTTLE_GREEN,
  blackwork: INK,
  floral: BOTTLE_GREEN,
  japanese: NAVY,
  portrait: NAVY,
  anime: FLASH_RED,
  "cover-ups": INK,
  geometric: INK,
  lettering: INK,
  ornamental: FLASH_YELLOW,
  "new-school": FLASH_RED,
  tribal: INK,
  watercolor: NAVY,
  dotwork: INK,
  chicano: NAVY,
}

interface StyleSymbolProps {
  slug: string
  size?: number
  className?: string
}

/** The style's shape-and-fill mark. Unknown slugs render nothing. */
export function StyleSymbol({ slug, size = 16, className }: StyleSymbolProps) {
  const shape = SYMBOLS[slug as StyleSlug]
  if (!shape) return null
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" className={className} focusable="false">
      {shape}
    </svg>
  )
}
