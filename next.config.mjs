// Content-Security-Policy, sent as Report-Only for now: the browser logs what
// it would block, so this can't break the site. Allows Supabase (API, storage,
// realtime), Mapbox (GL JS from the CDN, tiles, geocoding, its blob: workers),
// Google Fonts and Vercel (toolbar, analytics). Images allow any https source:
// listings show photos from many hosts. Switch the header name to
// Content-Security-Policy once the reports come back clean.
const SUPABASE = "https://hadiongieszvbnilacly.supabase.co"
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com https://vercel.live https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com https://vercel.live",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${SUPABASE} wss://hadiongieszvbnilacly.supabase.co https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://vercel.live wss://ws-us3.pusher.com https://va.vercel-scripts.com https://vitals.vercel-insights.com`,
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-src 'self' https://vercel.live",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ")

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "hadiongieszvbnilacly.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "streetviewpixels-pa.googleapis.com" },
      { protocol: "https", hostname: "inkfinder.tattoo" },
      { protocol: "https", hostname: "d1kq2dqeox7x40.cloudfront.net" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig
