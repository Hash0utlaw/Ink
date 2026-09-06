// Keep in sync with images.remotePatterns in next.config.mjs.
const ALLOWED_IMAGE_HOSTS = new Set([
  "images.unsplash.com",
  "hadiongieszvbnilacly.supabase.co",
  "lh3.googleusercontent.com",
  "streetviewpixels-pa.googleapis.com",
  "inkfinder.tattoo",
  "d1kq2dqeox7x40.cloudfront.net",
])

// next/image throws a hard error for any hostname not in remotePatterns.
// Scraped image URLs can point anywhere, so validate before handing a URL
// to next/image and fall back to a local placeholder rather than crashing.
export function safeImageSrc(url: string | null | undefined): string {
  if (!url) return "/placeholder.svg"
  try {
    const { hostname } = new URL(url)
    return ALLOWED_IMAGE_HOSTS.has(hostname) ? url : "/placeholder.svg"
  } catch {
    return "/placeholder.svg"
  }
}
