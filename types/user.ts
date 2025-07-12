import type { Artist } from "./artist"
import type { Shop } from "./shop"

export interface UserProfile {
  id: string
  name: string
  email: string
  avatarUrl: string
  location: string
}

export interface SavedDesign {
  id: string
  prompt: string
  style: string
  imageUrl: string
  createdAt: string
}

export interface Appointment {
  id: string
  artist: Pick<Artist, "id" | "name" | "avatarUrl">
  shop: Pick<Shop, "id" | "name">
  date: string
  time: string
  status: "upcoming" | "completed" | "cancelled"
}

export interface UserData {
  profile: UserProfile
  savedDesigns: SavedDesign[]
  appointments: Appointment[]
  favoriteArtists: Pick<Artist, "id" | "name" | "avatarUrl" | "specialties">[]
  favoriteShops: Pick<Shop, "id" | "name" | "logoUrl" | "location">[]
}
