import { useId } from "react"
import { cn } from "@/lib/utils"
import { BannerMark, bannerWidth } from "./banner"
import { CompassRoseMark } from "./compass-rose"
import { XMarkPath } from "./x-mark"

// The flash chart: SVG art copied from docs/design/brand-pieces-reference.html.
// Paths, coordinates, stroke widths and opacities are as in the reference; colors
// come from the theme tokens via Tailwind fill/stroke classes.
//   "hero"           home hero chart (viewBox 1200x560); no neighborhood labels
//   "hero-centered"  centered hero with coasts at the edges (viewBox 1200x640)
//   "location"       location map for artist/shop pages (viewBox 600x320)

const PLACE_FONT = { fontFamily: "var(--font-place), Georgia, serif", fontStyle: "italic" as const }

const Shop = ({ cx, cy }: { cx: number; cy: number }) => (
  <circle cx={cx} cy={cy} r="7" className="fill-vellum stroke-ink" strokeWidth="2.5" />
)

const Waves = ({ id, w, h, d, opacity, strokeWidth }: { id: string; w: number; h: number; d: string; opacity: number; strokeWidth: number }) => (
  <defs>
    <pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse">
      <path d={d} fill="none" className="stroke-cream" strokeOpacity={opacity} strokeWidth={strokeWidth} strokeLinecap="round" />
    </pattern>
  </defs>
)

function HeroChart({ waves, place, compassClassName }: { waves: string; place: string; compassClassName?: string }) {
  const coast =
    "M620,600 C600,530 642,486 622,432 C604,380 650,350 660,300 C670,250 640,210 668,170 C694,134 730,150 760,120 C790,90 820,96 850,70 C880,44 940,58 980,40 C1030,18 1100,30 1210,20"
  const roads = "M700,300 C780,290 860,300 1210,250 M880,600 C870,500 880,400 900,300 C910,230 960,150 1000,40"
  const river = "M1210,380 C1120,390 1080,350 1010,368 C940,386 920,450 850,468 C780,486 720,456 662,486 C646,494 636,502 630,512"
  const shops: [number, number][] = [
    [930, 205], [1000, 190], [1070, 250], [1010, 300], [790, 380], [820, 350],
    [845, 265], [1110, 170], [735, 300], [1150, 330], [960, 330],
  ]
  return (
    <>
      <Waves id={waves} w={30} h={16} d="M3 11 q6 -7 12 0" opacity={0.26} strokeWidth={1.3} />
      <rect width="1200" height="560" className="fill-navy" />
      <rect width="1200" height="560" fill={`url(#${waves})`} />
      <g className="stroke-cream" strokeOpacity="0.14" strokeWidth="1">
        <path d="M575,110 L1200,-60 M575,110 L1200,420 M575,110 L760,600 M575,110 L0,40 M575,110 L120,600" />
      </g>
      <path d={`${coast} L1210,600 Z`} className="fill-paper stroke-ink" strokeWidth="3.5" strokeLinejoin="round" />
      <path d={coast} fill="none" className="stroke-ink" strokeOpacity="0.4" strokeWidth="1.2" transform="translate(11 9)" />
      <path d={roads} fill="none" className="stroke-ink" strokeWidth="6" strokeLinecap="round" />
      <path d={roads} fill="none" className="stroke-vellum" strokeWidth="3" strokeLinecap="round" />
      <path d={river} fill="none" className="stroke-ink" strokeWidth="10" strokeLinecap="round" />
      <path d={river} fill="none" className="stroke-navy" strokeWidth="5.5" strokeLinecap="round" />
      {shops.map(([cx, cy]) => (
        <Shop key={`${cx}-${cy}`} cx={cx} cy={cy} />
      ))}
      <XMarkPath cx={880} cy={282} half={13} />
      <BannerMark cx={930} top={102} width={bannerWidth(place, 26, 240)} fontSize={26} text={place} />
      <CompassRoseMark x={575} y={118} scale={1.15} tone="sea" className={compassClassName} />
    </>
  )
}

function HeroCenteredChart({ waves }: { waves: string }) {
  const east =
    "M1000,660 C980,600 1012,560 992,500 C976,450 1010,420 1020,370 C1030,320 1004,280 1030,240 C1050,200 1090,210 1110,170 C1130,130 1120,80 1150,50 C1170,30 1190,20 1210,10"
  const west = "M-10,470 C40,468 72,500 112,490 C152,480 172,522 202,542 C232,562 222,600 252,622 L262,660"
  const shops: [number, number][] = [
    [1080, 300], [1130, 250], [1150, 380], [1060, 450], [1120, 520], [1170, 180], [60, 560], [150, 600],
  ]
  return (
    <>
      <Waves id={waves} w={30} h={16} d="M3 11 q6 -7 12 0" opacity={0.22} strokeWidth={1.3} />
      <rect width="1200" height="640" className="fill-navy" />
      <rect width="1200" height="640" fill={`url(#${waves})`} />
      <g className="stroke-cream" strokeOpacity="0.12" strokeWidth="1">
        <path d="M130,130 L1200,-40 M130,130 L1200,330 M130,130 L900,660 M130,130 L380,660 M130,130 L-20,380" />
      </g>
      <path d={`${east} L1210,660 Z`} className="fill-paper stroke-ink" strokeWidth="3.5" strokeLinejoin="round" />
      <path d={east} fill="none" className="stroke-ink" strokeOpacity="0.4" strokeWidth="1.2" transform="translate(11 6)" />
      <path d={`${west} L-10,660 Z`} className="fill-paper stroke-ink" strokeWidth="3.5" strokeLinejoin="round" />
      <path d={west} fill="none" className="stroke-ink" strokeOpacity="0.4" strokeWidth="1.2" transform="translate(4 10)" />
      {shops.map(([cx, cy]) => (
        <Shop key={`${cx}-${cy}`} cx={cx} cy={cy} />
      ))}
      <XMarkPath cx={1100} cy={410} half={12} />
      <CompassRoseMark x={130} y={130} scale={1.1} tone="sea" />
    </>
  )
}

function LocationChart({ place }: { place: string }) {
  const river = "M0,300 C80,280 120,230 190,220 C260,210 300,170 330,110"
  const roads = "M0,250 C200,240 380,200 600,120 M240,0 C260,120 250,240 280,320"
  return (
    <>
      <rect width="600" height="320" className="fill-paper" />
      <path
        d="M0,130 C150,140 300,160 420,320 M420,0 C430,120 470,220 600,260 M100,320 C160,220 330,120 480,0"
        fill="none"
        className="stroke-ink"
        strokeOpacity="0.5"
        strokeWidth="1.5"
      />
      <path d={river} fill="none" className="stroke-ink" strokeWidth="7" strokeLinecap="round" />
      <path d={river} fill="none" className="stroke-navy" strokeWidth="3.5" strokeLinecap="round" />
      <g fill="none" strokeLinecap="round">
        <path d={roads} className="stroke-ink" strokeWidth="8" />
        <path d={roads} className="stroke-vellum" strokeWidth="4" />
      </g>
      <g fontSize="17" className="fill-ink" style={PLACE_FONT}>
        <text x="440" y="200">Plaza Midwood</text>
        <text x="60" y="110">Uptown</text>
      </g>
      <XMarkPath cx={330} cy={190} half={12} />
      <BannerMark cx={330} top={79} width={bannerWidth(place, 20, 120)} fontSize={20} text={place} />
    </>
  )
}

const VARIANTS = {
  hero: { viewBox: "0 0 1200 560", aspect: "xMaxYMid slice", defaultPlace: "Destination Ink" },
  "hero-centered": { viewBox: "0 0 1200 640", aspect: "xMidYMid slice", defaultPlace: "" },
  location: { viewBox: "0 0 600 320", aspect: "xMidYMid slice", defaultPlace: "NoDa" },
} as const

interface FlashChartProps {
  variant: keyof typeof VARIANTS
  /** Name on the banner ("hero" and "location"). */
  placeName?: string
  /**
   * "top-right" anchors the crop to the top-right corner (xMaxYMin slice), so
   * short, wide strips keep the banner, X and compass inside the frame.
   */
  crop?: "default" | "top-right"
  /** Classes on the chart's own compass ("hero" only), e.g. to hide it at some widths. */
  compassClassName?: string
  className?: string
}

/** The flash chart. Fills its container; give the container a height. */
export function FlashChart({ variant, placeName, crop = "default", compassClassName, className }: FlashChartProps) {
  const waves = `waves-${useId().replace(/:/g, "")}`
  const v = VARIANTS[variant]
  const place = placeName || v.defaultPlace
  const label =
    variant === "hero"
      ? `Flash-style sea chart with shops marked, a red X and the banner "${place}"`
      : variant === "location"
        ? `Map of ${place} with a red X`
        : undefined
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <svg
        viewBox={v.viewBox}
        width="100%"
        height="100%"
        preserveAspectRatio={crop === "top-right" ? "xMaxYMin slice" : v.aspect}
        className="absolute inset-0 block"
        {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      >
        {variant === "hero" && <HeroChart waves={waves} place={place} compassClassName={compassClassName} />}
        {variant === "hero-centered" && <HeroCenteredChart waves={waves} />}
        {variant === "location" && <LocationChart place={place} />}
      </svg>
    </div>
  )
}
