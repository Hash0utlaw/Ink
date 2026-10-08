import { cn } from "@/lib/utils"

// Compass rose from docs/design/brand-pieces-reference.html. Drawn around (0,0);
// the points reach ±48 and the "N" sits at y = -56.
// tone "sea": ring and N in cream (on navy water). tone "land": ring and N in ink.
type Tone = "sea" | "land"

interface CompassRoseMarkProps {
  x: number
  y: number
  scale?: number
  tone?: Tone
  /** Extra classes on the group, e.g. to hide it at some breakpoints. */
  className?: string
}

/** The compass as an SVG group, for use inside a chart. */
export function CompassRoseMark({ x, y, scale = 1, tone = "sea", className }: CompassRoseMarkProps) {
  const ringAndN = tone === "sea" ? "stroke-cream" : "stroke-ink"
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className={cn("stroke-ink", className)} strokeWidth="1.6" strokeLinejoin="round">
      <circle r="30" fill="none" className={ringAndN} strokeOpacity="0.5" strokeWidth="1" />
      <path d="M0,0 L-6,-6 L-26,-26 Z M0,0 L6,6 L26,26 Z M0,0 L6,-6 L26,-26 Z M0,0 L-6,6 L-26,26 Z" className="fill-flash-red" />
      <path d="M0,0 L6,-6 L-26,-26 Z M0,0 L-6,6 L26,26 Z M0,0 L6,6 L26,-26 Z M0,0 L-6,-6 L-26,26 Z" className="fill-vellum" />
      <path d="M0,0 L-7,-7 L0,-48 Z M0,0 L7,7 L0,48 Z M0,0 L7,-7 L48,0 Z M0,0 L-7,7 L-48,0 Z" className="fill-flash-yellow" />
      <path d="M0,0 L7,-7 L0,-48 Z M0,0 L-7,7 L0,48 Z M0,0 L7,7 L48,0 Z M0,0 L-7,-7 L-48,0 Z" className="fill-vellum" />
      <circle r="5" className="fill-vellum" />
      <text
        y="-56"
        textAnchor="middle"
        stroke="none"
        fontSize="13"
        className={tone === "sea" ? "fill-cream" : "fill-ink"}
        style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
      >
        N
      </text>
    </g>
  )
}

interface CompassRoseProps {
  size?: number
  tone?: Tone
  className?: string
}

/** Standalone compass rose (decorative). */
export function CompassRose({ size = 96, tone = "land", className }: CompassRoseProps) {
  return (
    <svg
      viewBox="-56 -70 112 126"
      width={size}
      height={(size * 126) / 112}
      aria-hidden="true"
      focusable="false"
      className={cn("overflow-visible", className)}
    >
      <CompassRoseMark x={0} y={0} tone={tone} />
    </svg>
  )
}
