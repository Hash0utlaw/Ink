import Link from "next/link"
import { StyleBadge } from "@/components/brand/style-badge"
import { styleEntries } from "@/lib/styles"
import type { Shop } from "@/types/shop"

interface TopShopsProps {
  shops: (Shop & { artistCount: number })[]
  shopCount: number
}

function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`
}

export function TopShops({ shops, shopCount }: TopShopsProps) {
  if (shops.length === 0) return null
  return (
    <section aria-labelledby="top-shops-heading" className="mx-auto grid w-full max-w-[1344px] gap-8 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
      <div className="max-w-[44ch]">
        <h2 id="top-shops-heading" className="text-[30px] leading-[1.15] text-ink md:text-[34px]">
          Top-rated shops
        </h2>
        <p className="mt-3 text-pretty text-base leading-[1.55] text-ink-muted">
          {shopCount > 0 ? `${shopCount.toLocaleString("en-US")} shops across the US.` : "Shops across the US."} See them all on the map,
          with every artist who works there.
        </p>
        <Link href="/map" className="mt-2 inline-flex min-h-11 items-center font-semibold text-navy underline underline-offset-2 hover:no-underline">
          Open the map
        </Link>
      </div>

      <ul className="border-t border-rule">
        {shops.map((shop) => {
          const { address, city, state } = shop.location
          const badges = styleEntries(shop.styles).slice(0, 3)
          return (
            <li key={shop.id} className="border-b border-rule">
              <Link href={`/shops/${shop.id}`} className="group block py-5 hover:bg-secondary">
                <h3 className="font-heading text-[21px] leading-tight text-ink group-hover:underline">{shop.name}</h3>
                <p className="mt-1 text-[15px] text-ink">
                  {address && city && address.includes(city)
                    ? address
                    : [address, city && state ? `${city}, ${state}` : city].filter(Boolean).join(", ")}
                </p>
                <p className="mt-1 text-[15px] tabular-nums text-ink-muted">
                  Rated {shop.rating.toFixed(1)} from {plural(shop.reviewCount, "review", "reviews")}
                  {shop.artistCount > 0 && `, ${plural(shop.artistCount, "artist", "artists")} listed`}
                </p>
                {badges.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {badges.map(({ slug, label }) => (
                      <StyleBadge key={slug} slug={slug} label={label} />
                    ))}
                  </div>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
