import type { AcceptingClients } from "@/lib/profile-details"

export interface Review {
  id: string
  userName: string
  userAvatar: string
  rating: number
  comment: string
  date: string
}

export type { AcceptingClients }
export type AvailabilityStatus = "available" | "next_week" | "one_to_two_months" | "not_taking_clients"
export type PriceTier = "budget" | "mid" | "premium" | "luxury"

export interface Artist {
  id: string
  handle: string
  name: string
  shopName: string
  /** artists.shop_id, when the artist is listed at a shop. */
  shopId?: string
  /** artists.is_private_studio: the (claimed) artist says they work from a private studio. Only they set it. */
  isPrivateStudio: boolean
  /**
   * No shop, but a city-level point (artists.area_latitude/longitude, 2 decimals):
   * found in the finder and on the map at their city's center. Never an address.
   */
  hasAreaLocation: boolean
  /** Free-text tags as scraped/entered. Display and filtering use `styles`. */
  specialties: string[]
  /** Canonical style slugs from lib/styles.ts (artists.styles), in STYLES order. */
  styles: string[]
  rating: number
  reviewCount: number
  location: {
    address: string
    city: string
    state: string
    lat: number
    lng: number
  }
  avatarUrl: string
  /** artists.cover_image_url; owner uploads only (column added 2026-10-09). */
  coverImageUrl?: string
  portfolioImages: string[]
  previewImages: string[]
  isAvailable: boolean
  priceRange: "low" | "medium" | "high"
  priceTier: PriceTier
  availabilityStatus: AvailabilityStatus
  avgResponseHours: number | null
  firstBookingDiscount: number | null
  /** artists.accepting_clients: "Are you taking new clients?" Defaults to "yes"; only the artist sets it, so show it only once claimed. */
  acceptingClients: AcceptingClients
  /** Whole dollars, set by the artist in Profile details; null when not given. */
  shopMinimum: number | null
  hourlyRateMin: number | null
  hourlyRateMax: number | null
  pricingNotes?: string
  bio: string
  reviews: Review[]
  hours: {
    [key: string]: string
  }
  instagramHandle?: string
  /** artists.instagram_followers; null when we have no real count. */
  instagramFollowers: number | null
  /** artists.tiktok_handle, without the @. */
  tiktokHandle?: string
  /** First active portfolio photo (our storage only); the card image when there's no avatar. Set by callers that look it up. */
  cardPhotoUrl?: string | null
  websiteUrl?: string
  /** artists.booking_url: the artist's booking form or calendar. Imports filled it for many unclaimed rows too. */
  bookingUrl?: string
  isClaimed: boolean
  /** True when a TattooMaps account owns this profile (artists.user_id is set). */
  hasAccount?: boolean
  isVerified?: boolean
  /** Built from a shop_artists row, not an artists profile: has no profile page to link to. */
  isStub?: boolean
}
