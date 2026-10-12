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
// Scraped image URLs can point anywhere, so validate before handing a URL to
// next/image. A missing or disallowed image gives null, and callers show the
// brand fallback instead: <SafeImage> or <Plate> (initials on vellum), or an
// <AvatarFallback> initials circle. Images that fail to load fall back the same way.

/** The URL when next/image may load it, else null (callers show initials, never a placeholder). */
export function allowedImageSrc(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const { hostname } = new URL(url)
    return ALLOWED_IMAGE_HOSTS.has(hostname) ? url : null
  } catch {
    return null
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""

/** Public URL prefix for files in the "portfolio" storage bucket. */
export const PORTFOLIO_PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/portfolio/`

/**
 * The URL only when it's a file an owner uploaded to our storage. Scraped cover
 * photos (Google, Street View) have expired and return 403, so covers use this.
 */
export function uploadedImageSrc(url: string | null | undefined): string | null {
  if (!url || !SUPABASE_URL) return null
  return url.startsWith(PORTFOLIO_PUBLIC_PREFIX) ? url : null
}
