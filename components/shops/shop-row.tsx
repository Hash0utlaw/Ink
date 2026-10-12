import Link from "next/link"
import type { ReactNode } from "react"
import type { Shop } from "@/types/shop"
import { StyleBadge } from "@/components/brand/style-badge"
import { formatMapAddress } from "@/lib/format-address"
import { styleEntries } from "@/lib/styles"

/**
 * A shop as a list row, like the map list: name, "street, City, ST zip", a
 * rating line when there is one, and up to three style badges. Links to the shop.
 */
export function ShopRow({ shop, distanceMi }: { shop: Shop; distanceMi?: number }) {
  const { address, city, state, zip } = shop.location
  const line = formatMapAddress(address, city, state, zip)
  const styles = styleEntries(shop.styles)
  const rating =
    shop.rating > 0
      ? `Rated ${shop.rating.toFixed(1)}${shop.reviewCount > 0 ? ` from ${shop.reviewCount.toLocaleString("en-US")} ${shop.reviewCount === 1 ? "review" : "reviews"}` : ""}`
      : ""
  const distance = distanceMi != null ? `${distanceMi.toFixed(1)} mi away` : ""
  const meta = [rating, distance].filter(Boolean).join(", ")

  return (
    <li className="border-b border-rule">
      <Link
        href={`/shops/${shop.id}`}
        className="-mx-3 block rounded border-1.5 border-transparent px-3 py-4 hover:border-ink hover:bg-vellum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block font-heading text-[21px] leading-tight text-ink">{shop.name}</span>
        {line && <span className="mt-1 block text-[15px] text-ink">{line}</span>}
        {meta && <span className="mt-1 block text-[15px] tabular-nums text-ink-muted">{meta}</span>}
        {styles.length > 0 && (
          <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {styles.slice(0, 3).map(({ slug, label }) => (
              <StyleBadge key={slug} slug={slug} label={label} />
            ))}
            {styles.length > 3 && (
              <span className="text-sm font-semibold tabular-nums text-ink-muted">+{styles.length - 3}</span>
            )}
          </span>
        )}
      </Link>
    </li>
  )
}

/** Shop rows divided by rules; two columns from lg. */
export function ShopRowList({ children }: { children: ReactNode }) {
  return <ul className="grid border-t border-rule lg:grid-cols-2 lg:gap-x-10">{children}</ul>
}

export function ShopRowSkeleton() {
  return (
    <li className="border-b border-rule py-4" aria-hidden="true">
      <div className="h-6 w-2/3 rounded bg-secondary" />
      <div className="mt-2 h-4 w-1/2 rounded bg-secondary" />
      <div className="mt-2 h-4 w-1/3 rounded bg-secondary" />
    </li>
  )
}
