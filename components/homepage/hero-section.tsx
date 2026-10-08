import { CompassRose } from "@/components/brand/compass-rose"
import { FlashChart } from "@/components/brand/flash-chart"
import { NeatlineFrame } from "@/components/brand/neatline-frame"
import { HeroSearch } from "./hero-search"

interface HeroSectionProps {
  stats?: {
    shopCount: number
    artistCount: number
    cityCount: number
  }
}

// NeatlineFrame's border (2px) + padding (11px) + inner border (1.5px): the
// overlay layer sits exactly on the chart area.
const CHART_INSET = "lg:inset-[14.5px]"

/**
 * Home hero.
 * Below 1024px: the chart is a short strip (200px phones, 280px tablets) and the
 * search card sits below the frame, full width. The crop is anchored top-right so
 * the land, banner, X and the chart's own compass stay inside the frame.
 * From 1024px: the chart is 560px tall with the card over the sea. The chart's
 * compass is hidden (the card would cover it); from 1280px a standalone compass
 * sits in the open sea just right of the card. At 1024–1279px there isn't room
 * for the whole compass between the card and the coast, so none is shown.
 */
export function HeroSection({ stats }: HeroSectionProps = {}) {
  return (
    <section className="mx-auto w-full max-w-[1344px] px-6 pt-6 md:pt-8">
      <div className="relative">
        <NeatlineFrame>
          <FlashChart
            variant="hero"
            crop="top-right"
            compassClassName="lg:hidden"
            className="h-[200px] md:h-[280px] lg:h-[560px]"
          />
        </NeatlineFrame>

        <div className={`mt-4 lg:pointer-events-none lg:absolute lg:mt-0 lg:flex lg:items-center lg:p-12 ${CHART_INSET}`}>
          <div className="lg:pointer-events-auto lg:w-[470px]">
            <HeroSearch shopCount={stats?.shopCount ?? 0} artistCount={stats?.artistCount ?? 0} />
          </div>
          {/* 48px card offset + 470px card + 16px gap = 534px from the chart's left edge. */}
          <CompassRose size={100} tone="sea" className="absolute left-[534px] top-10 hidden xl:block" />
        </div>
      </div>
    </section>
  )
}
