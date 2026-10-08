// The red X (docs/design/brand-pieces-reference.html): an ink-cased flash-red cross.

interface XMarkPathProps {
  cx: number
  cy: number
  /** Half the arm length. The home hero uses 13, the other charts 12. */
  half?: number
}

/** The X as an SVG group, for use inside a chart. */
export function XMarkPath({ cx, cy, half = 12 }: XMarkPathProps) {
  const d = `M${cx - half},${cy - half} L${cx + half},${cy + half} M${cx + half},${cy - half} L${cx - half},${cy + half}`
  return (
    <g strokeLinecap="round">
      <path d={d} className="stroke-ink" strokeWidth="10" />
      <path d={d} className="stroke-flash-red" strokeWidth="5.5" />
    </g>
  )
}

/** Standalone X mark (decorative). */
export function XMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <XMarkPath cx={20} cy={20} />
    </svg>
  )
}
