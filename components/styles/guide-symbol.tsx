import { StyleSymbol } from "@/components/brand/style-symbol"
import { cn } from "@/lib/utils"

// Recolors a StyleSymbol for the night hero: ink and flash fills and strokes
// become cream, the vellum half (black & grey) becomes night, outlines stay outlines.
const CREAM =
  "[&_.fill-ink]:fill-cream [&_.fill-flash-red]:fill-cream [&_.fill-flash-yellow]:fill-cream [&_.fill-bottle-green]:fill-cream [&_.fill-navy]:fill-cream [&_.fill-vellum]:fill-night [&_.stroke-ink]:stroke-cream"

interface GuideSymbolProps {
  /** The exact master style (lib/style-guide.ts), or null for a plain outline circle. */
  masterSlug: string | null
  size?: number
  tone?: "ink" | "cream"
  className?: string
}

/**
 * A style guide page's mark: the master style's symbol when the guide style is
 * exactly that style, otherwise a plain outline circle (no borrowed symbol).
 */
export function GuideSymbol({ masterSlug, size = 16, tone = "ink", className }: GuideSymbolProps) {
  if (masterSlug) {
    return <StyleSymbol slug={masterSlug} size={size} className={cn(tone === "cream" && CREAM, className)} />
  }
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <circle cx="8" cy="8" r="6" fill="none" className={tone === "cream" ? "stroke-cream" : "stroke-ink"} strokeWidth="1.5" />
    </svg>
  )
}
