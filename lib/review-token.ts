import { createHmac, timingSafeEqual } from "node:crypto"

// The "Leave a review" link carries an HMAC of the booking id, signed with
// REVIEW_LINK_SECRET, so only the person who got the email can review. Server only.

function sign(bookingId: string): string | null {
  const secret = process.env.REVIEW_LINK_SECRET
  if (!secret) {
    console.error("[review-token] REVIEW_LINK_SECRET is not set; review links are disabled")
    return null
  }
  return createHmac("sha256", secret).update(`review:${bookingId}`).digest("base64url")
}

/** The token for a booking's review link, or null when the secret isn't set. */
export function reviewToken(bookingId: string): string | null {
  return sign(bookingId)
}

/** True when `token` is the signed token for this booking. */
export function isValidReviewToken(bookingId: string, token: unknown): boolean {
  if (typeof token !== "string" || !token) return false
  const expected = sign(bookingId)
  if (!expected) return false
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
