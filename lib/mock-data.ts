import type { Artist } from "@/types/artist"
import type { Shop } from "@/types/shop"

export const mockArtists: Artist[] = [
  {
    id: "1",
    name: "Marcus Chen",
    username: "marcusink",
    bio: "Specializing in Japanese traditional and neo-traditional styles with over 10 years of experience.",
    avatar: "/female-tattoo-artist-portrait-1.png",
    coverImage: "/japanese-dragon-tattoo.png",
    location: "San Francisco, CA",
    rating: 4.9,
    reviewCount: 127,
    yearsExperience: 10,
    specialties: ["Japanese", "Neo-Traditional", "Color Work"],
    priceRange: "high",
    portfolio: ["/japanese-dragon-tattoo.png", "/botanical-tattoo-1.png", "/fine-line-tattoo-1.png"],
    isVerified: true,
    isAvailable: true,
    nextAvailable: "2024-02-15",
    hourlyRate: 200,
    shopId: "1",
    shopName: "Ink & Steel Tattoo",
    socialMedia: {
      instagram: "@marcusink",
      website: "https://marcuschen.tattoo",
    },
    workingHours: {
      monday: "10:00-18:00",
      tuesday: "10:00-18:00",
      wednesday: "10:00-18:00",
      thursday: "10:00-18:00",
      friday: "10:00-20:00",
      saturday: "12:00-20:00",
      sunday: "closed",
    },
  },
  {
    id: "2",
    name: "Sarah Rodriguez",
    username: "sarahinks",
    bio: "Fine line and minimalist tattoo artist with a passion for botanical and geometric designs.",
    avatar: "/placeholder-user.jpg",
    coverImage: "/fine-line-tattoo-1.png",
    location: "Los Angeles, CA",
    rating: 4.8,
    reviewCount: 89,
    yearsExperience: 7,
    specialties: ["Fine Line", "Minimalist", "Botanical"],
    priceRange: "medium",
    portfolio: ["/fine-line-tattoo-1.png", "/botanical-tattoo-1.png"],
    isVerified: true,
    isAvailable: false,
    nextAvailable: "2024-03-01",
    hourlyRate: 150,
    shopId: "2",
    shopName: "Golden State Ink",
    socialMedia: {
      instagram: "@sarahinks",
    },
    workingHours: {
      monday: "closed",
      tuesday: "11:00-19:00",
      wednesday: "11:00-19:00",
      thursday: "11:00-19:00",
      friday: "11:00-19:00",
      saturday: "10:00-18:00",
      sunday: "12:00-17:00",
    },
  },
]

export const mockShops: Shop[] = [
  {
    id: "1",
    name: "Ink & Steel Tattoo",
    description: "Premier tattoo studio specializing in custom artwork and traditional techniques.",
    address: "123 Mission Street, San Francisco, CA 94103",
    phone: "(415) 555-0123",
    email: "info@inkandsteel.com",
    website: "https://inkandsteel.com",
    images: ["/tattoo-shop-interior.png", "/dark-artistic-tattoo-studio.png"],
    rating: 4.9,
    reviewCount: 234,
    priceRange: "high",
    specialties: ["Japanese", "Traditional", "Custom Work"],
    amenities: ["Free Consultation", "Aftercare Products", "Private Rooms"],
    workingHours: {
      monday: "10:00-20:00",
      tuesday: "10:00-20:00",
      wednesday: "10:00-20:00",
      thursday: "10:00-20:00",
      friday: "10:00-22:00",
      saturday: "12:00-22:00",
      sunday: "12:00-18:00",
    },
    socialMedia: {
      instagram: "@inkandsteel",
      facebook: "InkAndSteelTattoo",
    },
    residentArtists: [
      {
        id: "1",
        name: "Marcus Chen",
        avatar: "/female-tattoo-artist-portrait-1.png",
        specialties: ["Japanese", "Neo-Traditional"],
      },
      {
        id: "3",
        name: "Alex Thompson",
        avatar: "/placeholder-user.jpg",
        specialties: ["Traditional", "Black & Gray"],
      },
    ],
    isVerified: true,
    establishedYear: 2015,
  },
  {
    id: "2",
    name: "Golden State Ink",
    description: "Modern tattoo parlor focusing on contemporary styles and artistic expression.",
    address: "456 Sunset Boulevard, Los Angeles, CA 90028",
    phone: "(323) 555-0456",
    email: "hello@goldenstateink.com",
    website: "https://goldenstateink.com",
    images: ["/dark-artistic-tattoo-studio.png"],
    rating: 4.7,
    reviewCount: 156,
    priceRange: "medium",
    specialties: ["Fine Line", "Watercolor", "Geometric"],
    amenities: ["Walk-ins Welcome", "Custom Designs", "Touch-up Guarantee"],
    workingHours: {
      monday: "closed",
      tuesday: "11:00-19:00",
      wednesday: "11:00-19:00",
      thursday: "11:00-19:00",
      friday: "11:00-21:00",
      saturday: "10:00-21:00",
      sunday: "12:00-18:00",
    },
    socialMedia: {
      instagram: "@goldenstateink",
    },
    residentArtists: [
      {
        id: "2",
        name: "Sarah Rodriguez",
        avatar: "/placeholder-user.jpg",
        specialties: ["Fine Line", "Minimalist"],
      },
    ],
    isVerified: true,
    establishedYear: 2018,
  },
]

// Location data for the map
export interface MapLocation {
  id: string
  name: string
  type: "artist" | "shop"
  address: string
  coordinates: [number, number] // [longitude, latitude]
  rating: number
  reviewCount: number
  specialties: string[]
  priceRange: "low" | "medium" | "high"
  image: string
  phone?: string
  website?: string
  isOpen: boolean
  distance?: number
}

export const mockLocations: MapLocation[] = [
  {
    id: "1",
    name: "Ink & Steel Tattoo",
    type: "shop",
    address: "123 Mission Street, San Francisco, CA 94103",
    coordinates: [-122.4194, 37.7749],
    rating: 4.9,
    reviewCount: 234,
    specialties: ["Japanese", "Traditional", "Custom Work"],
    priceRange: "high",
    image: "/tattoo-shop-interior.png",
    phone: "(415) 555-0123",
    website: "https://inkandsteel.com",
    isOpen: true,
  },
  {
    id: "2",
    name: "Golden State Ink",
    type: "shop",
    address: "456 Sunset Boulevard, Los Angeles, CA 90028",
    coordinates: [-118.2437, 34.0522],
    rating: 4.7,
    reviewCount: 156,
    specialties: ["Fine Line", "Watercolor", "Geometric"],
    priceRange: "medium",
    image: "/dark-artistic-tattoo-studio.png",
    phone: "(323) 555-0456",
    website: "https://goldenstateink.com",
    isOpen: true,
  },
  {
    id: "3",
    name: "Marcus Chen",
    type: "artist",
    address: "123 Mission Street, San Francisco, CA 94103",
    coordinates: [-122.4194, 37.7749],
    rating: 4.9,
    reviewCount: 127,
    specialties: ["Japanese", "Neo-Traditional", "Color Work"],
    priceRange: "high",
    image: "/female-tattoo-artist-portrait-1.png",
    isOpen: true,
  },
  {
    id: "4",
    name: "Sarah Rodriguez",
    type: "artist",
    address: "456 Sunset Boulevard, Los Angeles, CA 90028",
    coordinates: [-118.2437, 34.0522],
    rating: 4.8,
    reviewCount: 89,
    specialties: ["Fine Line", "Minimalist", "Botanical"],
    priceRange: "medium",
    image: "/placeholder-user.jpg",
    isOpen: false,
  },
  {
    id: "5",
    name: "Black Rose Tattoo",
    type: "shop",
    address: "789 Castro Street, San Francisco, CA 94114",
    coordinates: [-122.435, 37.7609],
    rating: 4.6,
    reviewCount: 98,
    specialties: ["Blackwork", "Tribal", "Cover-ups"],
    priceRange: "medium",
    image: "/dark-artistic-tattoo-studio.png",
    phone: "(415) 555-0789",
    isOpen: true,
  },
  {
    id: "6",
    name: "Luna Martinez",
    type: "artist",
    address: "321 Venice Beach, Los Angeles, CA 90291",
    coordinates: [-118.4695, 33.985],
    rating: 4.7,
    reviewCount: 76,
    specialties: ["Watercolor", "Abstract", "Portraits"],
    priceRange: "high",
    image: "/placeholder-user.jpg",
    isOpen: true,
  },
  {
    id: "7",
    name: "Electric Needle Studio",
    type: "shop",
    address: "654 Haight Street, San Francisco, CA 94117",
    coordinates: [-122.4481, 37.7694],
    rating: 4.5,
    reviewCount: 143,
    specialties: ["Realism", "Portraits", "Black & Gray"],
    priceRange: "high",
    image: "/tattoo-shop-interior.png",
    phone: "(415) 555-0654",
    website: "https://electricneedle.com",
    isOpen: false,
  },
  {
    id: "8",
    name: "Jake Morrison",
    type: "artist",
    address: "987 Melrose Avenue, Los Angeles, CA 90069",
    coordinates: [-118.384, 34.0836],
    rating: 4.8,
    reviewCount: 112,
    specialties: ["Traditional", "American Traditional", "Bold Lines"],
    priceRange: "medium",
    image: "/placeholder-user.jpg",
    isOpen: true,
  },
]

export const getMapLocations = async (): Promise<MapLocation[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))
  return mockLocations
}

export const tattooStyles = [
  "Traditional",
  "Realism",
  "Japanese",
  "Geometric",
  "Watercolor",
  "Blackwork",
  "Fine Line",
  "Neo-Traditional",
  "Tribal",
  "Minimalist",
  "Portrait",
  "Abstract",
  "Botanical",
  "Cover-up",
]
