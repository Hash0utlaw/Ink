// Homepage hero art: a flash-style composite skyline with a red sun setting behind
// the middle of it. Decorative only. The city is generated once at module load from a
// fixed seed, so server and client render the same markup.
//
// The viewBox is 2400 wide and anchored bottom-center with "slice": at 1024px and up
// (290px tall) the buildings draw at 1:1 and wider screens just show more of the city;
// phones (166px tall) show the middle 680 units at about 0.57x. Strokes don't scale
// (non-scaling-stroke), so the outline stays a set width at every size.

const W = 2400
const H = 290
const CX = W / 2
const SUN_R = 150
const SUN_Y = H - 140

type Roof = "flat" | "stepped" | "spire" | "gable" | "dome" | "tower"
const ROOFS: Roof[] = ["flat", "stepped", "spire", "gable", "dome", "tower"]

/** Small seeded PRNG (mulberry32). */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const r1 = (n: number) => Math.round(n * 10) / 10

interface City {
  buildings: string[]
  towers: string[]
  legs: string
  ticks: string
  lit: string
}

function buildCity(): City {
  const rand = rng(1912)
  const between = (a: number, b: number) => a + rand() * (b - a)
  const buildings: string[] = []
  const towers: string[] = []
  let legs = ""
  let ticks = ""
  let lit = ""
  let prev: Roof | null = null
  let x = -20

  while (x < W + 20) {
    const w = Math.round(between(30, 66))
    const mid = x + w / 2
    const dist = Math.abs(mid - CX)
    // Lower buildings in front of the sun so about half of it shows above the roofs.
    const h = Math.round(dist < 230 ? between(64, 140) : dist < 420 ? between(100, 230) : between(70, 262))
    const options = ROOFS.filter((r) => r !== prev && !(r === "spire" && w < 40) && !(r === "tower" && h > 200))
    const roof = options[Math.floor(rand() * options.length)]
    prev = roof

    const top = H - h
    const right = x + w
    let body = top // where the windows start
    let d: string

    switch (roof) {
      case "stepped": {
        const i = w * 0.2
        body = H - h * 0.8
        d = `M${x} ${H}V${body}H${x + i}V${top}H${right - i}V${body}H${right}V${H}Z`
        break
      }
      case "spire": {
        const i = w * 0.24
        const sw = w * 0.1
        body = H - h * 0.74
        const step = H - h * 0.86
        d = `M${x} ${H}V${body}H${x + i}V${step}H${mid - sw}L${mid} ${top}L${mid + sw} ${step}H${right - i}V${body}H${right}V${H}Z`
        break
      }
      case "gable": {
        body = top + w * 0.42
        d = `M${x} ${H}V${body}L${mid} ${top}L${right} ${body}V${H}Z`
        break
      }
      case "dome": {
        const p = w * 0.14
        const r = (w - 2 * p) / 2
        body = top + r
        d = `M${x} ${H}V${body}H${x + p}A${r} ${r} 0 0 1 ${right - p} ${body}H${right}V${H}Z`
        break
      }
      case "tower": {
        // Flat roof with a water tower: tank on two legs, conical cap.
        const tx = x + w * between(0.3, 0.6)
        const tankTop = top - 26
        legs += `M${tx - 6} ${top}V${tankTop + 14}M${tx + 6} ${top}V${tankTop + 14}`
        towers.push(`M${tx - 9} ${tankTop + 14}V${tankTop + 2}L${tx} ${tankTop - 8}L${tx + 9} ${tankTop + 2}V${tankTop + 14}Z`)
        d = `M${x} ${H}V${top}H${right}V${H}Z`
        break
      }
      default:
        d = `M${x} ${H}V${top}H${right}V${H}Z`
    }
    buildings.push(d.replace(/\d+\.\d+/g, (n) => String(r1(Number(n)))))

    // Window ticks: a grid inside the walls; about a third lit.
    const cols = Math.floor((w - 14) / 13)
    const left = x + (w - (cols - 1) * 13) / 2 - 2.5
    for (let y = body + 16; y < H - 12; y += 16) {
      for (let c = 0; c < cols; c++) {
        const wx = r1(left + c * 13)
        const wy = r1(y)
        if (rand() < 0.33) lit += `M${r1(wx - 0.5)} ${r1(wy - 4)}h6v8h-6z`
        else ticks += `M${wx} ${wy}h5`
      }
    }

    x = right
  }

  return { buildings, towers, legs, ticks, lit }
}

const CITY = buildCity()

const outline = "stroke-ink [stroke-width:3px] lg:[stroke-width:3.5px]"

export function HeroSkyline({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx={CX} cy={SUN_Y} r={SUN_R} vectorEffect="non-scaling-stroke" className="fill-flash-red stroke-ink [stroke-width:3px] lg:[stroke-width:4px]" />
      <circle cx={CX} cy={SUN_Y} r={SUN_R - 12} vectorEffect="non-scaling-stroke" fill="none" className="stroke-cream/50 [stroke-width:1.5px] lg:[stroke-width:2px]" />
      <path d={CITY.legs} vectorEffect="non-scaling-stroke" fill="none" className="stroke-ink [stroke-width:2px]" />
      <g strokeLinejoin="round" className={`fill-paper ${outline}`}>
        {CITY.towers.map((d, i) => (
          <path key={`t${i}`} d={d} vectorEffect="non-scaling-stroke" />
        ))}
        {CITY.buildings.map((d, i) => (
          <path key={i} d={d} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <path d={CITY.ticks} vectorEffect="non-scaling-stroke" fill="none" className="stroke-ink [stroke-width:1.5px] lg:[stroke-width:2px]" />
      <path d={CITY.lit} vectorEffect="non-scaling-stroke" className="fill-flash-yellow stroke-ink [stroke-width:0] md:[stroke-width:1px]" />
    </svg>
  )
}

/** Navy water under the skyline: ink waterline (the border) and faint cream wave strokes. */
export function HeroWater({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`relative border-t-4 border-ink bg-navy ${className ?? ""}`}>
      <svg className="absolute inset-0 h-full w-full" focusable="false">
        <defs>
          <pattern id="hero-waves" width="88" height="68" patternUnits="userSpaceOnUse">
            <path d="M14 26q10-7 20 0t20 0M58 60q10-7 20 0t20 0M-30 60q10-7 20 0t20 0" fill="none" className="stroke-cream/50" strokeWidth="2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-waves)" />
      </svg>
    </div>
  )
}
