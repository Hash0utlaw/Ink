// Single source for the site's public address and outgoing-email settings.

function resolveSiteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  return url.replace(/\/+$/, "")
}

/** Absolute site origin, no trailing slash. */
export const SITE_URL = resolveSiteUrl()

/**
 * Origin for absolute URLs inside emails (links, the wordmark image). Emails
 * outlive the deployment that sent them, so this never falls back to a preview
 * URL: NEXT_PUBLIC_SITE_URL, or the live domain.
 */
export const EMAIL_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tattoo-maps.com").replace(/\/+$/, "")

/** Support inbox shown to users. */
export const SUPPORT_EMAIL = "support@tattoomaps.com"

/** Sender for all transactional emails. */
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "TattooMaps <bookings@tattoo-maps.com>"

/** Reply-To for emails sent to clients, claimants and artists. */
export const REPLY_TO = process.env.RESEND_REPLY_TO || undefined

/** Inbox for admin notifications. */
export const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || undefined
