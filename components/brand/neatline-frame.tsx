import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"

// Striped chart border (docs/design/brand-pieces-reference.html, "Neatline frame"):
// 2px ink outer border, 11px padding, 5px bars of alternating 24px ink / transparent
// on all four sides (3px inset), 1.5px ink inner border. Use once per page.
const STRIPES_X = "repeating-linear-gradient(90deg, hsl(var(--ink)) 0 24px, transparent 24px 48px)"
const STRIPES_Y = "repeating-linear-gradient(180deg, hsl(var(--ink)) 0 24px, transparent 24px 48px)"

const bar = (style: CSSProperties, className?: string) => (
  <span aria-hidden="true" className={cn("absolute", className)} style={style} />
)

interface NeatlineFrameProps {
  children: ReactNode
  /** Sizing for the outer frame, e.g. "h-[320px]". */
  className?: string
  /** Frame only at 1024px and up; below that the children sit edge to edge.
      The element tree is the same at every width, so children never remount. */
  desktopOnly?: boolean
}

export function NeatlineFrame({ children, className, desktopOnly = false }: NeatlineFrameProps) {
  const hide = desktopOnly ? "max-lg:hidden" : undefined
  return (
    <div className={cn("relative border-2 border-ink bg-paper p-[11px]", desktopOnly && "max-lg:border-0 max-lg:p-0", className)}>
      {bar({ top: 3, left: 3, right: 3, height: 5, background: STRIPES_X }, hide)}
      {bar({ bottom: 3, left: 3, right: 3, height: 5, background: STRIPES_X }, hide)}
      {bar({ top: 3, bottom: 3, left: 3, width: 5, background: STRIPES_Y }, hide)}
      {bar({ top: 3, bottom: 3, right: 3, width: 5, background: STRIPES_Y }, hide)}
      <div className={cn("relative h-full overflow-hidden border-1.5 border-ink", desktopOnly && "max-lg:border-0")}>
        {children}
      </div>
    </div>
  )
}
