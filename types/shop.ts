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
  }
  phone: string
  website: string
  residentArtistIds: string[]
  about: string
  reviews: Review[]
  hours: {
    [key: string]: string
  }
  /** Canonical style slugs from shop_styles (lib/styles.ts), in STYLES order. */
  styles: string[]
  acceptsWalkIns: boolean
  // Open-data signal that the shop may have closed; hidden from lists and the
  // map, but its page stays reachable.
  possiblyClosed?: boolean
  distance_mi?: number
}
