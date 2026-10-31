import Image from "next/image"
import { HeroSkyline, HeroWater } from "@/components/home/hero-skyline"
import { HeroSearch } from "./hero-search"

interface HeroSectionProps {
  stats?: {
    shopCount: number
    artistCount: number
    cityCount: number
  }
}

/** Rounded down to the nearest thousand, e.g. 26,437 -> "26,000". */
function roundedThousands(n: number): string {
  return (Math.floor(n / 1000) * 1000).toLocaleString("en-US")
}

/**
 * Home hero: a night band with the cream wordmark, the h1, and the flash skyline
 * with its sun and water. The search card overlaps the band's bottom edge by 64px
 * (760px wide from 768px, full width minus 16px on phones) and the tagline sits
 * under it. Every height here is fixed, so nothing shifts as the page loads.
 */
export function HeroSection({ stats }: HeroSectionProps = {}) {
  const shopCount = stats?.shopCount ?? 0
  const artistCount = stats?.artistCount ?? 0
  const counts = shopCount > 0 && artistCount > 0

  return (
    <section className="w-full">
      <div className="border-b-3 border-ink bg-night tex-night">
        <div className="flex flex-col items-center gap-3 px-4 pt-9 text-center md:pt-14">
          {/* The header already names the site, so the big wordmark is decorative. */}
          <Image
            src="/brand/logo-wordmark-cream.webp"
            alt=""
            width={180}
            height={104}
            priority
            className="h-[58px] w-auto md:h-[104px]"
          />
          <h1 className="text-balance font-heading text-[28px] leading-[1.1] text-cream md:text-[44px]">
            Find a tattoo artist near you
          </h1>
        </div>
        <HeroSkyline className="mt-8 block h-[166px] w-full sm:h-[220px] md:mt-12 lg:h-[290px]" />
        <HeroWater className="h-[110px] md:h-[130px]" />
      </div>

      <div className="relative z-10 mx-auto -mt-16 flex w-full max-w-[776px] flex-col items-center gap-3.5 px-2">
        <HeroSearch />
        <p className="max-w-[640px] text-pretty px-2 text-center text-[15px] leading-[1.55] text-ink-muted md:text-[17px]">
          {counts
            ? `Search ${roundedThousands(shopCount)} shops and ${roundedThousands(artistCount)} artists by place and style, then send a request straight to the artist. Free, with no booking fees.`
            : "Search shops and artists by place and style, then send a request straight to the artist. Free, with no booking fees."}
        </p>
      </div>
    </section>
  )
}
