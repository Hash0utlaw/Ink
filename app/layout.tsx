import type React from "react"
import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
})

export const metadata: Metadata = {
  title: "TattooMaps - Discover Artists & Shops Worldwide",
  description:
    "The ultimate platform for discovering tattoo artists and shops through interactive maps. Find artists near you, explore styles, and book appointments.",
  keywords: ["tattoo", "artists", "shops", "maps", "discovery", "booking", "AI generator"],
  authors: [{ name: "TattooMaps Team" }],
  creator: "TattooMaps",
  publisher: "TattooMaps",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://tattoomaps.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TattooMaps - Discover Artists & Shops Worldwide",
    description:
      "Find tattoo artists and shops near you with our interactive map platform. Explore portfolios, book appointments, and generate AI tattoo designs.",
    url: "https://tattoomaps.com",
    siteName: "TattooMaps",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TattooMaps - Discover Artists & Shops Worldwide",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TattooMaps - Discover Artists & Shops Worldwide",
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
  generator: "v0.dev",
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
