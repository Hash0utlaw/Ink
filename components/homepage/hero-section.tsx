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

/** Home hero: the flash chart in its neatline frame, with the search card over the sea. */
export function HeroSection({ stats }: HeroSectionProps = {}) {
  return (
    <section className="mx-auto w-full max-w-[1344px] px-6 pt-6 md:pt-8">
      <NeatlineFrame>
        <div className="relative">
          <FlashChart variant="hero" className="absolute inset-0" />
          <div className="relative z-10 flex min-h-[520px] items-center p-4 sm:p-8 md:min-h-[560px] md:p-12">
            <HeroSearch shopCount={stats?.shopCount ?? 0} artistCount={stats?.artistCount ?? 0} />
          </div>
        </div>
      </NeatlineFrame>
    </section>
  )
}
