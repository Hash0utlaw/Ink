import type React from "react"
import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import { SITE_URL } from "@/lib/site-config"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
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
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TattooMaps - Discover Tattoo Artists & Shops Across the US",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TattooMaps - Discover Tattoo Artists & Shops Across the US",
    description: "Find tattoo artists and shops near you with our interactive map platform.",
    images: ["/og-image.png"],
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
        {children}
        <Toaster />
      </body>
    </html>
  )
}
