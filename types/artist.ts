export interface Review {
  id: string
  userName: string
  userAvatar: string
  rating: number
  comment: string
  date: string
}

export type AvailabilityStatus = "available" | "next_week" | "one_to_two_months" | "not_taking_clients"
export type PriceTier = "budget" | "mid" | "premium" | "luxury"

export interface Artist {
  id: string
  handle: string
  name: string
  shopName: string
  specialties: string[]
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
  portfolioImages: string[]
  previewImages: string[]
  isAvailable: boolean
  priceRange: "low" | "medium" | "high"
  priceTier: PriceTier
  availabilityStatus: AvailabilityStatus
  avgResponseHours: number | null
  firstBookingDiscount: number | null
  bio: string
  reviews: Review[]
  hours: {
    [key: string]: string
  }
  instagramHandle?: string
  websiteUrl?: string
}
