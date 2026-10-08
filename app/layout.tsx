import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import { AdminGateBanner } from "@/components/layout/admin-gate-banner"
import { SITE_URL } from "@/lib/site-config"

// Poppins (latin, 400–900) is stored in app/fonts so builds never fetch from Google Fonts.
const poppins = localFont({
  src: [
    { path: "./fonts/poppins-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/poppins-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/poppins-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/poppins-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/poppins-latin-800-normal.woff2", weight: "800", style: "normal" },
    { path: "./fonts/poppins-latin-900-normal.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-poppins",
})

export const metadata: Metadata = {
  title: "TattooMaps - Discover Tattoo Artists & Shops Across the US",
  description:
    "The ultimate platform for discovering tattoo artists and shops through interactive maps. Find artists near you, explore styles, and book appointments.",
  keywords: ["tattoo", "artists", "shops", "maps", "discovery", "booking"],
  authors: [{ name: "TattooMaps Team" }],
  creator: "TattooMaps",
  publisher: "TattooMaps",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/app-icon.png", type: "image/png", sizes: "512x512" },
      { url: "/icon-dark-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/app-icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/app-icon.png",
  },
  openGraph: {
    title: "TattooMaps - Discover Tattoo Artists & Shops Across the US",
    description:
      "Find tattoo artists and shops near you with our interactive map platform. Explore portfolios and book appointments.",
    url: SITE_URL,
    siteName: "TattooMaps",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TattooMaps - Discover Tattoo Artists & Shops Across the US",
    description: "Find tattoo artists and shops near you with our interactive map platform.",
    creator: "@tattoomaps",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn("min-h-screen bg-background font-sans antialiased", poppins.variable)}>
        <AdminGateBanner />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
