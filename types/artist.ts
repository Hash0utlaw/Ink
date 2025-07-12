export interface Review {
  id: string
  userName: string
  userAvatar: string
  rating: number
  comment: string
  date: string
}

export interface Artist {
  id: string
  name: string
  shopName: string
  specialties: string[]
  rating: number
  reviewCount: number
  location: {
    address: string
    city: string
    lat: number
    lng: number
  }
  avatarUrl: string
  portfolioImages: string[]
  isAvailable: boolean
  priceRange: "low" | "medium" | "high"
  bio: string
  reviews: Review[]
  hours: {
    [key: string]: string
  }
}
