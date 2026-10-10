import Link from "next/link"
import type { ArtistShop } from "@/lib/supabase/artists"
import { formatMapAddress } from "@/lib/map-data"
import { staticMapUrl } from "@/lib/mapbox"
import { XMark } from "@/components/brand/x-mark"
import { Banner } from "@/components/brand/banner"
import { ProfileSection } from "./profile-sections"

const TEXT_LINK = "font-semibold text-navy underline underline-offset-2 hover:no-underline"

/** "35.247° N, 80.806° W" */
function formatCoordinates([lng, lat]: [number, number]) {
  return `${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(3)}° ${lng >= 0 ? "E" : "W"}`
}

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

/** Hours in weekday order (jsonb keeps keys alphabetical); unknown keys go last. */
function orderedHours(hours: Record<string, string>) {
  const rank = (day: string) => {
    const i = WEEKDAYS.indexOf(day.toLowerCase())
    return i === -1 ? WEEKDAYS.length : i
  }
  return Object.entries(hours)
    .filter(([, value]) => String(value ?? "").trim())
    .sort(([a], [b]) => rank(a) - rank(b))
}

interface WhereToFindProps {
  name: string
  shop: ArtistShop
  /** On the shop's own page: no "View shop" link, and the rating is already in its header. */
  onShopPage?: boolean
  phone?: string
  website?: string
}

/** The shop on a static chart (when it has coordinates), its address, rating, contact and hours. */
export function WhereToFind({ name, shop, onShopPage = false, phone, website }: WhereToFindProps) {
  const address = formatMapAddress(shop.address, shop.city, shop.state, shop.zip)
  const hours = orderedHours(shop.hours)
  const websiteUrl = website?.trim()
  const directions = shop.coordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${shop.coordinates[1]},${shop.coordinates[0]}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([shop.name, address].join(", "))}`

  return (
    <ProfileSection id="where" title={`Where to find ${name}`}>
      <div
        className={shop.coordinates ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10" : undefined}
      >
        {shop.coordinates && (
          // Plain 1px ink border: the header's "Where to find" panel holds the page's one striped frame.
          <div className="border border-ink">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={staticMapUrl(shop.coordinates)}
                alt={`Map showing ${shop.name}${shop.city ? ` in ${shop.city}` : ""}`}
                width={800}
                height={320}
                loading="lazy"
                decoding="async"
                className="block h-[220px] w-full bg-chart-land object-cover sm:h-auto"
              />
              <XMark size={36} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
              {shop.city && (
                <Banner
                  text={shop.city}
                  className="pointer-events-none absolute left-1/2 top-2 max-w-[90%] -translate-x-1/2"
                />
              )}
            </div>
          </div>
        )}

        <div className="text-[15px] leading-[1.55] text-ink">
          <p className="font-heading text-[22px] leading-[1.15]">{shop.name}</p>
          {address && <p className="mt-2">{address}</p>}
          {shop.coordinates && (
            <p className="mt-1 font-place text-base italic text-ink-muted">{formatCoordinates(shop.coordinates)}</p>
          )}
          {!onShopPage && (
            <p className="mt-1 tabular-nums text-ink-muted">
              {shop.rating > 0
                ? `Rated ${shop.rating.toFixed(1)}${shop.reviewCount > 0 ? ` from ${shop.reviewCount.toLocaleString("en-US")} ${shop.reviewCount === 1 ? "review" : "reviews"}` : ""}`
                : "No reviews yet"}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <a href={directions} target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>
              Get directions
            </a>
            {phone && (
              <a href={`tel:${phone}`} className={TEXT_LINK}>
                Call {phone}
              </a>
            )}
            {websiteUrl && (
              <a
                href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className={TEXT_LINK}
              >
                Website
              </a>
            )}
            {!onShopPage && (
              <Link href={`/shops/${shop.id}`} className={TEXT_LINK}>
                View shop
              </Link>
            )}
          </div>

          {hours.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold">Hours</h3>
              <dl className="mt-2 border-t border-rule">
                {hours.map(([day, value]) => (
                  <div key={day} className="flex justify-between gap-4 border-b border-rule py-2">
                    <dt className="capitalize">{day}</dt>
                    <dd className="text-right text-ink-muted">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </ProfileSection>
  )
}
