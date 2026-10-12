import Link from "next/link"
import { StyleSymbol } from "@/components/brand/style-symbol"
import { STYLES, styleLabel } from "@/lib/styles"
import type { StyleCount } from "@/lib/supabase/home"
import { ALL_STYLES } from "@/app/styles/page"

// Style guide pages exist for some slugs only; the rest go to the artist search
// filtered to that style (the same rule the previous homepage used).
const GUIDE_SLUGS = new Set<string>(ALL_STYLES.map((s) => s.slug))
const styleHref = (slug: string) => (GUIDE_SLUGS.has(slug) ? `/styles/${slug}` : `/artists?styles=${slug}`)

export function BrowseByStyle({ counts }: { counts: StyleCount[] }) {
  // Without counts (query failed), still list ten styles, just without numbers.
  const rows: { slug: string; artists: number | null }[] =
    counts.length > 0
      ? counts.slice(0, 10)
      : STYLES.slice(0, 10).map((s) => ({ slug: s.slug, artists: null }))
  return (
    <section aria-labelledby="browse-style-heading" className="mx-auto grid w-full max-w-[1344px] gap-8 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
      <div className="max-w-[44ch]">
        <h2 id="browse-style-heading" className="text-[30px] leading-[1.15] text-ink md:text-[34px]">
          Browse by style
        </h2>
        <p className="mt-3 text-pretty text-base leading-[1.55] text-ink-muted">
          Every artist is sorted into the same 21 styles. Each style keeps its symbol everywhere, from these lists to the pins on the map.
        </p>
        <Link href="/styles" className="mt-2 inline-flex min-h-11 items-center font-semibold text-navy underline underline-offset-2 hover:no-underline">
          See all 21 styles
        </Link>
      </div>

      <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ slug, artists }) => (
          <li key={slug} className="border-b border-rule">
            <Link href={styleHref(slug)} className="flex min-h-[44px] items-center gap-3 py-3 hover:bg-secondary">
              <StyleSymbol slug={slug} size={16} className="shrink-0" />
              <span className="text-base font-semibold text-ink">{styleLabel(slug)}</span>
              {artists !== null && (
                <span className="ml-auto text-[15px] tabular-nums text-ink-muted">
                  {artists.toLocaleString("en-US")} artists
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
