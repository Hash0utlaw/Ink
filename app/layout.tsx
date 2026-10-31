import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import { AdminGateBanner } from "@/components/layout/admin-gate-banner"
import { SITE_URL } from "@/lib/site-config"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

// Brand fonts (see .claude/skills/tattoomaps-design) are stored in app/fonts so builds
// never fetch from Google Fonts. All three are SIL OFL; see app/fonts/OFL-LICENSES.txt.
const libreFranklin = localFont({
  src: [
    { path: "./fonts/libre-franklin-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/libre-franklin-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/libre-franklin-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/libre-franklin-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-sans",
})

const youngSerif = localFont({
  src: [{ path: "./fonts/young-serif-latin-400-normal.woff2", weight: "400", style: "normal" }],
  variable: "--font-heading",
})

const imFellEnglish = localFont({
  src: [{ path: "./fonts/im-fell-english-latin-400-italic.woff2", weight: "400", style: "italic" }],
  variable: "--font-place",
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
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-paper tex-paper font-sans antialiased",
          libreFranklin.variable,
          youngSerif.variable,
          imFellEnglish.variable
        )}
      >
        <AdminGateBanner />
        {children}
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
