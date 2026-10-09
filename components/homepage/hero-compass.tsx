"use client"

import { useEffect, useRef, useState } from "react"
import { CompassRose } from "@/components/brand/compass-rose"
import { HERO_COAST } from "@/components/brand/flash-chart"

// Desktop hero compass (1024px and up). It sits in the open sea between the search
// card and the coast: centered between the card's right edge and the coastline,
// at least 32px from the card, with its N 24px or more below the chart's top edge.
// When the whole compass doesn't fit there, it isn't shown.

const SIZE = 100
const HEIGHT = (SIZE * 126) / 112
const TOP = 24 // element top; the N's cap sits about 4px lower
const CARD_CLEARANCE = 32
const COAST_CLEARANCE = 16 // keeps the compass off the coast's stroke and shadow line
const CHART_INSET = 14.5 // NeatlineFrame: 2px border + 11px padding + 1.5px inner border

/** Points along the coastline (viewBox units), from its absolute cubic segments. */
const COAST_POINTS: [number, number][] = (() => {
  const n = HERO_COAST.match(/-?\d+(\.\d+)?/g)!.map(Number)
  const pts: [number, number][] = []
  let [x0, y0] = [n[0], n[1]]
  for (let i = 2; i + 5 < n.length; i += 6) {
    const [x1, y1, x2, y2, x3, y3] = n.slice(i, i + 6)
    for (let t = 0; t <= 1; t += 0.02) {
      const u = 1 - t
      pts.push([
        u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      ])
    }
    ;[x0, y0] = [x3, y3]
  }
  return pts
})()

/**
 * The chart is drawn with preserveAspectRatio "xMaxYMin slice": scaled to cover the
 * chart area, anchored top-right. Returns the leftmost coast x (in chart px) within
 * the compass's vertical band.
 */
function coastLeft(chartW: number, chartH: number) {
  const s = Math.max(chartW / 1200, chartH / 560)
  const offsetX = chartW - 1200 * s
  let min = Infinity
  for (const [x, y] of COAST_POINTS) {
    const py = y * s
    if (py >= TOP && py <= TOP + HEIGHT) min = Math.min(min, offsetX + x * s)
  }
  return min
}

export function HeroCompass() {
  const ref = useRef<HTMLDivElement>(null)
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => {
    const overlay = ref.current?.parentElement
    const card = overlay?.querySelector<HTMLElement>("[data-hero-card]")
    if (!overlay || !card) return

    const place = () => {
      if (!window.matchMedia("(min-width: 1024px)").matches) return setLeft(null)
      const box = overlay.getBoundingClientRect()
      const cardRight = card.getBoundingClientRect().right - box.left - CHART_INSET
      const coast = coastLeft(box.width - 2 * CHART_INSET, box.height - 2 * CHART_INSET)
      const x = (cardRight + coast) / 2 - SIZE / 2
      setLeft(Number.isFinite(x) && x >= cardRight + CARD_CLEARANCE && x + SIZE <= coast - COAST_CLEARANCE ? x : null)
    }

    place()
    const ro = new ResizeObserver(place)
    ro.observe(overlay)
    ro.observe(card)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute hidden lg:block"
      style={{ top: CHART_INSET + TOP, left: left === null ? 0 : CHART_INSET + left, visibility: left === null ? "hidden" : "visible" }}
    >
      <CompassRose size={SIZE} tone="sea" />
    </div>
  )
}
