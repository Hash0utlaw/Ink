import { FlashChart } from "@/components/brand/flash-chart"
import { NeatlineFrame } from "@/components/brand/neatline-frame"
import { HeroCompass } from "./hero-compass"
import { HeroSearch } from "./hero-search"

interface HeroSectionProps {
  stats?: {
    shopCount: number
    artistCount: number
    cityCount: number
  }
}

/**
 * Home hero.
 * Below 1024px: the chart is a short strip (200px phones, 280px tablets) and the
 * search card sits below the frame, full width. The crop is anchored top-right so
 * the land, banner, X and the chart's own compass stay inside the frame.
 * From 1024px: the card is in flow and sets the hero's height; the frame and chart
 * fill the hero behind it. Padding = frame (14.5px: 2px border + 11px padding +
 * 1.5px inner border) + the card gap (40px, 48px from 1280px), so the gap is the
 * same above, below and left of the card. The card is 430px wide at 1024–1279px so
 * the banner stays clear of it, 470px from 1280px. The chart's own compass is hidden and
 * HeroCompass places one in the open sea when it fits.
 */
export function HeroSection({ stats }: HeroSectionProps = {}) {
  return (
    <section className="mx-auto w-full max-w-[1344px] px-6 pt-6 md:pt-8">
      <div className="relative">
        <NeatlineFrame className="lg:absolute lg:inset-0">
          <FlashChart
            variant="hero"
            crop="top-right"
            compassClassName="lg:hidden"
            className="h-[200px] md:h-[280px] lg:h-full"
          />
        </NeatlineFrame>

        <div className="mt-4 lg:relative lg:mt-0 lg:flex lg:items-center lg:p-[54.5px] xl:p-[62.5px]">
          <div data-hero-card className="lg:w-[430px] xl:w-[470px]">
            <HeroSearch shopCount={stats?.shopCount ?? 0} artistCount={stats?.artistCount ?? 0} />
          </div>
          <HeroCompass />
        </div>
      </div>
    </section>
  )
}
