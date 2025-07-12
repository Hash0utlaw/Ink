import type { Artist } from "@/types/artist"
import type { Shop } from "@/types/shop"
import type { UserData } from "@/types/user"
import type { ArtistDashboardData } from "@/types/artist-dashboard"

const artists: Artist[] = [
  {
    id: "1",
    name: "Valerie",
    shopName: "Black Oak Tattoo",
    specialties: ["Fine Line", "Botanical", "Blackwork", "Micro-Realism"],
    rating: 4.9,
    reviewCount: 124,
    location: {
      address: "123 Art St",
      city: "San Francisco, CA",
      lat: 37.7749,
      lng: -122.4194,
    },
    avatarUrl: "/female-tattoo-artist-portrait-1.png",
    portfolioImages: [
      "/fine-line-tattoo-1.png",
      "/botanical-tattoo-1.png",
      "/placeholder-g6gvv.png",
      "/placeholder-lpicf.png",
      "/japanese-dragon-tattoo.png",
      "/placeholder-kafzv.png",
    ],
    isAvailable: true,
    priceRange: "medium",
    bio: "Valerie is a San Francisco-based artist specializing in delicate fine line and botanical tattoos. With over 8 years of experience, she brings a unique and elegant touch to every piece, creating timeless art that flows with the body's natural form. Her studio, Black Oak, is a serene space designed to make every client feel comfortable and inspired.",
    reviews: [
      {
        id: "r1",
        userName: "Jessica L.",
        userAvatar: "JL",
        rating: 5,
        comment:
          "Valerie is incredibly talented! She brought my vision to life perfectly. The studio is clean and has a great vibe.",
        date: "2 weeks ago",
      },
      {
        id: "r2",
        userName: "Mark T.",
        userAvatar: "MT",
        rating: 5,
        comment:
          "An amazing experience from start to finish. Professional, kind, and a true artist. I couldn't be happier with my tattoo.",
        date: "1 month ago",
      },
    ],
    hours: {
      Monday: "Closed",
      Tuesday: "11am - 7pm",
      Wednesday: "11am - 7pm",
      Thursday: "11am - 7pm",
      Friday: "11am - 8pm",
      Saturday: "11am - 8pm",
      Sunday: "12pm - 5pm",
    },
  },
  {
    id: "3",
    name: "Chloe",
    shopName: "Black Oak Tattoo",
    specialties: ["Watercolor", "Abstract"],
    rating: 4.8,
    reviewCount: 88,
    location: { address: "San Francisco, CA", lat: 37.7749, lng: -122.4194 },
    avatarUrl: "/placeholder.svg?height=100&width=100",
    portfolioImages: ["/placeholder.svg?height=300&width=300", "/placeholder.svg?height=300&width=300"],
    isAvailable: true,
    priceRange: "medium",
    bio: "Chloe's work is a vibrant explosion of color and form. She pushes the boundaries of watercolor tattoos, creating fluid, dreamlike pieces that are both bold and beautiful.",
    reviews: [],
    hours: {},
  },
  {
    id: "2",
    name: "Kenji",
    shopName: "Oni Tattoo",
    specialties: ["Japanese", "Irezumi", "Dragons", "Large Scale"],
    rating: 4.5,
    reviewCount: 150,
    location: {
      address: "456 Dragon Ave",
      city: "Los Angeles, CA",
      lat: 34.0522,
      lng: -118.2437,
    },
    avatarUrl: "/placeholder-lpicf.png",
    portfolioImages: ["/japanese-dragon-tattoo.png", "/placeholder-kafzv.png"],
    isAvailable: true,
    priceRange: "high",
    bio: "Kenji is a master artist specializing in Japanese and Irezumi tattoos. With a deep understanding of tradition and history, he brings authenticity and excellence to every piece.",
    reviews: [
      {
        id: "r3",
        userName: "Emily W.",
        userAvatar: "EW",
        rating: 5,
        comment: "Kenji's work is stunning. He captured the essence of my vision perfectly. Highly recommend!",
        date: "1 week ago",
      },
    ],
    hours: {
      Monday: "12pm - 8pm",
      Tuesday: "12pm - 8pm",
      Wednesday: "12pm - 8pm",
      Thursday: "12pm - 8pm",
      Friday: "12pm - 10pm",
      Saturday: "12pm - 10pm",
      Sunday: "Closed",
    },
  },
]

const shops: Shop[] = [
  {
    id: "s1",
    name: "Black Oak Tattoo",
    logoUrl: "/black-oak-logo.png",
    coverImageUrl: "/tattoo-shop-interior.png",
    rating: 4.9,
    reviewCount: 312,
    location: {
      address: "123 Art St",
      city: "San Francisco, CA",
      lat: 37.7749,
      lng: -122.4194,
    },
    residentArtistIds: ["1", "3"],
    about:
      "Black Oak Tattoo is a premier, custom tattoo studio located in the heart of San Francisco. We provide a clean, comfortable, and inspiring environment for both our artists and clients. Our diverse team of world-class artists specializes in a wide range of styles, ensuring we can bring any vision to life. We are committed to artistic excellence and providing a memorable, professional experience for every person who walks through our doors.",
    reviews: [
      {
        id: "sr1",
        userName: "David P.",
        userAvatar: "DP",
        rating: 5,
        comment:
          "The best shop in the city. Super clean, professional, and everyone is so talented. The vibe is perfect.",
        date: "3 days ago",
      },
      {
        id: "sr2",
        userName: "Samantha B.",
        userAvatar: "SB",
        rating: 5,
        comment:
          "I felt so comfortable here for my first tattoo. The staff was welcoming and helped me find the perfect artist for my idea.",
        date: "2 months ago",
      },
    ],
    hours: {
      Monday: "Closed",
      Tuesday: "11am - 7pm",
      Wednesday: "11am - 7pm",
      Thursday: "11am - 7pm",
      Friday: "11am - 8pm",
      Saturday: "11am - 8pm",
      Sunday: "12pm - 5pm",
    },
    specialties: ["Fine Line", "Botanical", "Blackwork", "Watercolor", "Abstract", "Realism"],
    acceptsWalkIns: true,
  },
  {
    id: "s2",
    name: "Oni Tattoo",
    logoUrl: "/placeholder.svg?height=100&width=100",
    coverImageUrl: "/placeholder.svg?height=400&width=1200",
    rating: 5.0,
    reviewCount: 210,
    location: { address: "456 Dragon Ave", city: "Los Angeles, CA", lat: 34.0522, lng: -118.2437 },
    residentArtistIds: ["2"],
    about:
      "Authentic Japanese and Irezumi tattoos by master artists. We honor the tradition and history of this timeless art form.",
    reviews: [],
    hours: {
      Monday: "12pm - 8pm",
      Tuesday: "12pm - 8pm",
      Wednesday: "12pm - 8pm",
      Thursday: "12pm - 8pm",
      Friday: "12pm - 10pm",
      Saturday: "12pm - 10pm",
      Sunday: "Closed",
    },
    specialties: ["Japanese", "Irezumi", "Dragons", "Large Scale"],
    acceptsWalkIns: false,
  },
]

const userData: UserData = {
  profile: {
    id: "u1",
    name: "Alex Doe",
    email: "alex.doe@example.com",
    avatarUrl: "/diverse-user-avatars.png",
    location: "San Francisco, CA",
  },
  savedDesigns: [
    {
      id: "d1",
      prompt: "A stoic wolf in a pine forest, geometric patterns",
      style: "Geometric",
      imageUrl: "/placeholder-76soj.png",
      createdAt: "2 weeks ago",
    },
    {
      id: "d2",
      prompt: "Cosmic jellyfish with vibrant nebula colors",
      style: "Watercolor",
      imageUrl: "/placeholder-4xvx8.png",
      createdAt: "1 month ago",
    },
  ],
  appointments: [
    {
      id: "a1",
      artist: { id: "1", name: "Valerie", avatarUrl: "/female-tattoo-artist-portrait-1.png" },
      shop: { id: "s1", name: "Black Oak Tattoo" },
      date: "2025-08-15",
      time: "02:00 PM",
      status: "upcoming",
    },
    {
      id: "a2",
      artist: { id: "2", name: "Kenji", avatarUrl: "/placeholder-lpicf.png" },
      shop: { id: "s2", name: "Oni Tattoo" },
      date: "2025-05-20",
      time: "04:00 PM",
      status: "completed",
    },
  ],
  favoriteArtists: [
    {
      id: "1",
      name: "Valerie",
      avatarUrl: "/female-tattoo-artist-portrait-1.png",
      specialties: ["Fine Line", "Botanical"],
    },
  ],
  favoriteShops: [
    {
      id: "s1",
      name: "Black Oak Tattoo",
      logoUrl: "/black-oak-logo.png",
      location: { city: "San Francisco, CA", address: "", lat: 0, lng: 0 },
    },
  ],
}

const artistDashboardData: ArtistDashboardData = {
  clients: [
    {
      id: "c1",
      name: "Jessica L.",
      avatarUrl: "/placeholder.svg",
      email: "jess.l@example.com",
      totalAppointments: 1,
      lastAppointmentDate: "2025-06-15",
      notes: "Loves floral designs, sits very well.",
    },
    {
      id: "c2",
      name: "Mark T.",
      avatarUrl: "/placeholder.svg",
      email: "mark.t@example.com",
      totalAppointments: 3,
      lastAppointmentDate: "2025-05-20",
      notes: "Working on a full sleeve. Next session is for the forearm.",
    },
  ],
  analytics: {
    profileViews: { currentMonth: 1234, changePercent: 15.2 },
    bookingRequests: { currentMonth: 42, changePercent: -5.1 },
    estimatedRevenue: { currentMonth: 8500, changePercent: 20.0 },
    revenueChartData: [
      { month: "Jan", revenue: 4500 },
      { month: "Feb", revenue: 5200 },
      { month: "Mar", revenue: 7100 },
      { month: "Apr", revenue: 6500 },
      { month: "May", revenue: 8200 },
      { month: "Jun", revenue: 8500 },
    ],
    stylePopularity: [
      { style: "Botanical", count: 45 },
      { style: "Fine Line", count: 38 },
      { style: "Blackwork", count: 12 },
    ],
  },
}

export async function getArtistById(id: string): Promise<Artist | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  return artists.find((artist) => artist.id === id)
}

export async function getShopById(id: string): Promise<Shop | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  return shops.find((shop) => shop.id === id)
}

export async function getArtistsByIds(ids: string[]): Promise<Artist[]> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  return artists.filter((artist) => ids.includes(artist.id))
}

export async function getShops(): Promise<Shop[]> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  return shops
}

export async function getArtists(): Promise<Artist[]> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  return artists
}

export async function getUserData(): Promise<UserData> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  return userData
}

export async function getArtistDashboardData(): Promise<ArtistDashboardData> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  return artistDashboardData
}

export async function getArtistsByStyle(style: string): Promise<Artist[]> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  // Case-insensitive matching for style
  const normalizedStyle = style.toLowerCase().replace("-", " ")
  return artists.filter((artist) => artist.specialties.some((s) => s.toLowerCase() === normalizedStyle))
}
