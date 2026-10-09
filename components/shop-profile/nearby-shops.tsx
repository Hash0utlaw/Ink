import Link from "next/link"
import type { Shop } from "@/types/shop"
import { ProfileSection } from "@/components/artist-profile/profile-sections"

/** Up to four nearby shops as list rows, each linking to its page. */
export function NearbyShops({ shops }: { shops: Shop[] }) {
  if (shops.length === 0) return null
  return (
    <ProfileSection id="nearby" title="Nearby shops">
      <ul className="border-t border-rule">
        {shops.map((shop) => (
          <li key={shop.id} className="border-b border-rule">
            <Link
              href={`/shops/${shop.id}`}
              className="-mx-2 block rounded-lg border-1.5 border-transparent px-2 py-4 hover:border-ink hover:bg-vellum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block font-heading text-[21px] leading-tight text-ink">{shop.name}</span>
              {shop.location.city && (
                <span className="mt-1 block font-place text-base italic text-ink-muted">{shop.location.city}</span>
              )}
              <span className="mt-1 block text-[15px] tabular-nums text-ink-muted">
                {shop.rating > 0
                  ? `Rated ${shop.rating.toFixed(1)}${shop.reviewCount > 0 ? ` from ${shop.reviewCount.toLocaleString("en-US")} ${shop.reviewCount === 1 ? "review" : "reviews"}` : ""}`
                  : "No reviews yet"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </ProfileSection>
  )
}
