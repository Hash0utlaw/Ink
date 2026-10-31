// Coming-soon gate. While ON, only admins (ADMIN_EMAILS) see the real site;
// everyone else gets /coming-soon. Set SITE_LAUNCHED=true in Vercel's
// production env (and redeploy) to turn it off.

/** True on Vercel production until SITE_LAUNCHED is "true". Always off locally and on previews. */
export function isLaunchGateOn(): boolean {
  return process.env.VERCEL_ENV === "production" && process.env.SITE_LAUNCHED !== "true"
}

export const COMING_SOON_PATH = "/coming-soon"

/** Non-httpOnly hint cookie the middleware sets for admins so the banner can render client-side. */
export const GATE_ADMIN_COOKIE = "tm_gate_admin"

const ALLOWED_EXACT = new Set([
  COMING_SOON_PATH,
  "/login",
  "/forgot-password",
  "/robots.txt",
  "/favicon.ico",
  "/opengraph-image",
  "/twitter-image",
  "/api/health", // uptime check
  "/monitoring", // Sentry tunnel (rewritten to /sentry-tunnel)
  "/sentry-tunnel",
])

const ALLOWED_PREFIXES = ["/auth/", "/api/cron/", "/_next/", "/_vercel/", "/brand/"]

// Any path ending in a file extension (public/ assets: images, icons, fonts, manifests…).
const STATIC_FILE = /\.[a-z0-9]+$/i

/** Paths anyone may reach while the gate is on. */
export function isAllowedWhileGated(pathname: string): boolean {
  if (ALLOWED_EXACT.has(pathname)) return true
  if (ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))) return true
  return STATIC_FILE.test(pathname)
}
