import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"

// Striped chart border (docs/design/brand-pieces-reference.html, "Neatline frame"):
// 2px ink outer border, 11px padding, 5px bars of alternating 24px ink / transparent
// on all four sides (3px inset), 1.5px ink inner border. Use once per page.
const STRIPES_X = "repeating-linear-gradient(90deg, hsl(var(--ink)) 0 24px, transparent 24px 48px)"
const STRIPES_Y = "repeating-linear-gradient(180deg, hsl(var(--ink)) 0 24px, transparent 24px 48px)"

const bar = (style: CSSProperties) => <span aria-hidden="true" className="absolute" style={style} />

interface NeatlineFrameProps {
  children: ReactNode
  /** Sizing for the outer frame, e.g. "h-[320px]". */
  className?: string
}

export function NeatlineFrame({ children, className }: NeatlineFrameProps) {
  return (
    <div className={cn("relative border-2 border-ink bg-paper p-[11px]", className)}>
      {bar({ top: 3, left: 3, right: 3, height: 5, background: STRIPES_X })}
      {bar({ bottom: 3, left: 3, right: 3, height: 5, background: STRIPES_X })}
      {bar({ top: 3, bottom: 3, left: 3, width: 5, background: STRIPES_Y })}
      {bar({ top: 3, bottom: 3, right: 3, width: 5, background: STRIPES_Y })}
      <div className="relative h-full overflow-hidden border-1.5 border-ink">{children}</div>
    </div>
  )
}
