// The banner (docs/design/brand-pieces-reference.html): a vellum ribbon with folded
// chart-land tails and the place name in Young Serif. Both banners in the reference
// follow the same geometry from (cx, top, width); this reproduces them exactly:
//   home hero  cx 930, top 102, width 240, font 26  -> "Charlotte"
//   location   cx 330, top 79,  width 120, font 20  -> "NoDa"

interface BannerMarkProps {
  cx: number
  top: number
  /** Ribbon width. Grows for long names so the text stays on the ribbon. */
  width: number
  fontSize: number
  text: string
}

export function bannerWidth(text: string, fontSize: number, minWidth: number) {
  return Math.max(minWidth, Math.round(text.length * fontSize * 0.62) + 36)
}

/** The banner as an SVG group, for use inside a chart. */
export function BannerMark({ cx, top, width, fontSize, text }: BannerMarkProps) {
  const x1 = cx - width / 2
  const x2 = cx + width / 2
  const tail = (edge: number, dir: 1 | -1) =>
    `M${edge - 12 * dir},${top + 8} L${edge + 6 * dir},${top + 6} L${edge + 6 * dir},${top + 38} L${edge - 12 * dir},${top + 40} L${edge - 3 * dir},${top + 24} Z`
  return (
    <g>
      <path d={tail(x1, 1)} className="fill-chart-land stroke-ink" strokeWidth="2" strokeLinejoin="round" />
      <path d={tail(x2, -1)} className="fill-chart-land stroke-ink" strokeWidth="2" strokeLinejoin="round" />
      <path
        d={`M${x1},${top} Q${cx},${top - 12} ${x2},${top} L${x2},${top + 30} Q${cx},${top + 18} ${x1},${top + 30} Z`}
        className="fill-vellum stroke-ink"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <text
        x={cx}
        y={top + 19}
        textAnchor="middle"
        fontSize={fontSize}
        className="fill-ink"
        style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
      >
        {text}
      </text>
    </g>
  )
}

/** Standalone banner with a place name. */
export function Banner({ text, fontSize = 20, className }: { text: string; fontSize?: number; className?: string }) {
  const width = bannerWidth(text, fontSize, 120)
  const w = width + 32
  return (
    <svg
      viewBox={`0 0 ${w} 56`}
      width={w}
      height={56}
      role="img"
      aria-label={text}
      className={className}
    >
      <BannerMark cx={w / 2} top={12} width={width} fontSize={fontSize} text={text} />
    </svg>
  )
}
