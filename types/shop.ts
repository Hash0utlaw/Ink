import type { Review } from "./artist"

export interface Shop {
  id: string
  slug: string
  name: string
  logoUrl: string
  coverImageUrl: string
  rating: number
  reviewCount: number
  location: {
    address: string
    city: string
    state: string
    lat: number
    lng: number
    zip?: string
  }
  phone: string
  website: string
  /** shops.website_status from the crawl: ok, redirected, not_found, dead, parked or error. */
  websiteStatus?: string | null
  instagramUrl?: string
  /** shops.instagram_followers; null when we have no real count. */
  instagramFollowers?: number | null
  tiktokUrl?: string
  facebookUrl?: string
  youtubeUrl?: string
  residentArtistIds: string[]
  about: string
  reviews: Review[]
  hours: {
    [key: string]: string
  }
  /** Canonical style slugs from shop_styles (lib/styles.ts), in STYLES order. */
  styles: string[]
  acceptsWalkIns: boolean
  /** An owner has claimed the listing (shops.owner_user_id). */
  isClaimed?: boolean
  // Open-data signal that the shop may have closed; hidden from lists and the
  // map, but its page stays reachable.
  possiblyClosed?: boolean
  distance_mi?: number
}
