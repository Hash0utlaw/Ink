import type { Review } from "./artist"

export interface Shop {
  id: string
  name: string
  logoUrl: string
  coverImageUrl: string
  rating: number
  reviewCount: number
  location: {
    address: string
    city: string
    lat: number
    lng: number
  }
  residentArtistIds: string[]
  about: string
  reviews: Review[]
  hours: {
    [key: string]: string
  }
  specialties: string[]
  acceptsWalkIns: boolean // New property
}
