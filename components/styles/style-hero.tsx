import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import type { ALL_STYLES } from "@/app/styles/page"
import { GuideSymbol } from "./guide-symbol"

interface StyleHeroProps {
  style: (typeof ALL_STYLES)[number]
  /** The exact master style (lib/style-guide.ts), or null for a plain outline circle. */
  masterSlug: string | null
}

/**
 * The style page's strip, full bleed right under the site header (render it
 * outside any max-width container), sized like the profile cover: 150px tall
 * on mobile, 260px from lg, 3px ink bottom border. The style's symbol and name
 * in cream on the night chart; no image.
 */
export function StyleHero({ style, masterSlug }: StyleHeroProps) {
  return (
    <div className="relative h-[150px] overflow-hidden border-b-[3px] border-ink bg-night tex-night-chart lg:h-[260px]">
      <div className="mx-auto flex h-full max-w-[1180px] flex-col justify-center px-4 sm:px-6">
        <Link
          href="/styles"
          className="absolute top-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-cream/85 hover:text-cream lg:top-5"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          All styles
        </Link>
        <div className="mt-6 flex items-center gap-4 lg:mt-4 lg:gap-6">
          <GuideSymbol masterSlug={masterSlug} tone="cream" size={44} className="shrink-0 lg:h-[72px] lg:w-[72px]" />
          <h1 className="font-heading text-[34px] leading-[1.05] text-cream text-balance lg:text-[56px]">{style.name}</h1>
        </div>
      </div>
    </div>
  )
}
