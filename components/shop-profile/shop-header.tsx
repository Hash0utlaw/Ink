import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Globe, Phone } from "lucide-react"
import type { Shop } from "@/types/shop"
import { SaveButton } from "@/components/saved/save-button"
import { ShareButton } from "@/components/share/share-button"
import { StyleBadgeList } from "@/components/artist-profile/style-badge-list"
import { Plate } from "@/components/brand/plate"
import { allowedImageSrc } from "@/lib/utils/safe-image"
import { STATE_ABBR_TO_NAME } from "@/lib/utils/states"

const PRIMARY =
  "min-h-11 rounded-lg border-1.5 border-ink bg-flash-red px-5 text-[15px] font-semibold text-white hover:bg-flash-red/90"
const SECONDARY =
  "min-h-11 rounded-lg border-1.5 border-ink bg-vellum px-4 text-[15px] font-semibold text-ink hover:bg-secondary"
const TEXT_LINK = "font-semibold text-navy underline underline-offset-2 hover:no-underline"

export function directionsHref(shop: Shop) {
  const { lat, lng, address, city, state } = shop.location
  if (lat && lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  }
  const query = [address, city, state].filter(Boolean).join(", ")
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function ShopHeader({ shop, initialSaved }: { shop: Shop; initialSaved?: boolean }) {
  // Only the shop's own logo; scraped cover photos (Google, Street View) have expired and return 403.
  const photo = allowedImageSrc(shop.logoUrl)
  const stateName = STATE_ABBR_TO_NAME[shop.location.state] ?? shop.location.state
  const place = [shop.location.city, stateName].filter(Boolean).join(", ")
  const websiteUrl = shop.website?.trim()
  const claimHref = shop.slug ? `/claim?shop=${encodeURIComponent(shop.slug)}` : "/claim"

  return (
    <div className="grid grid-cols-[128px_minmax(0,1fr)] items-start gap-x-4 gap-y-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-x-12">
      <div className="lg:row-span-2">
        <Plate
          src={photo}
          alt={photo ? `${shop.name}, tattoo shop` : `${shop.name} initials`}
          name={shop.name}
          primaryStyle={shop.styles[0]}
          fluid
          sizes="(min-width: 1024px) 300px, 128px"
        />
      </div>

      <div className="min-w-0 lg:pt-2">
        <h1 className="font-heading text-[32px] leading-[1.05] text-ink text-balance lg:text-[56px]">{shop.name}</h1>
        {place && <p className="mt-2 font-place text-[17px] italic text-ink-muted lg:text-[19px]">{place}</p>}
        {shop.rating > 0 && (
          <p className="mt-2 text-[15px] tabular-nums text-ink-muted">
            Rated {shop.rating.toFixed(1)}
            {shop.reviewCount > 0 &&
              ` from ${shop.reviewCount.toLocaleString("en-US")} ${shop.reviewCount === 1 ? "review" : "reviews"}`}
          </p>
        )}
      </div>

      <div className="col-span-2 min-w-0 space-y-5 lg:col-span-1 lg:col-start-2">
        {shop.styles.length > 0 && <StyleBadgeList styles={shop.styles} max={4} />}

        <div className="flex flex-wrap gap-2">
          <Button className={PRIMARY} asChild>
            <a href={directionsHref(shop)} target="_blank" rel="noopener noreferrer">
              Get directions
            </a>
          </Button>
          <SaveButton itemType="shop" itemId={shop.id} variant="full" initialSaved={initialSaved} className={SECONDARY} />
          <ShareButton
            name={shop.name}
            title={`${shop.name}, tattoo shop${shop.location.city ? ` in ${shop.location.city}` : ""}`}
            className={`${SECONDARY} w-11 px-0`}
          />
        </div>

        {(websiteUrl || shop.phone) && (
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
            {websiteUrl && (
              <a
                href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 ${TEXT_LINK}`}
              >
                <Globe className="h-4 w-4" aria-hidden="true" />
                Website
              </a>
            )}
            {shop.phone && (
              <a href={`tel:${shop.phone}`} className={`inline-flex items-center gap-1.5 ${TEXT_LINK}`}>
                <Phone className="h-4 w-4" aria-hidden="true" />
                Call {shop.phone}
              </a>
            )}
          </div>
        )}

        {!shop.isClaimed && (
          <p className="max-w-prose text-[15px] leading-[1.55] text-ink-muted text-pretty">
            {shop.name}&apos;s details come from public listings. If you own this shop,{" "}
            <Link href={claimHref} className={TEXT_LINK}>
              claim this page
            </Link>{" "}
            to add your team and keep the details current.
          </p>
        )}
      </div>
    </div>
  )
}
