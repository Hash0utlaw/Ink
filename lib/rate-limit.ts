import { createHash } from "node:crypto"
import { createAdminClient } from "@/utils/supabase/admin"

// Shared limits for the public forms, kept in Supabase (rate_limit_events via
// rate_limit_hit) because serverless instances don't share memory. Keys are
// SHA-256 hashes; raw IPs and emails are never stored. Server only.

export type RateLimitedAction = "contact" | "booking" | "claim" | "review"

const PER_IP = { limit: 5, windowSeconds: 60 * 60 } // 5 an hour
const PER_EMAIL = { limit: 5, windowSeconds: 24 * 60 * 60 } // 5 a day

export const RATE_LIMIT_MESSAGE = "You've sent several of these recently. Please try again later."

function hash(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

/** The caller's IP as Vercel reports it. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return request.headers.get("x-real-ip")?.trim() || forwarded || "unknown"
}

async function hit(bucket: string, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
    p_bucket: bucket,
    p_key: hash(key),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    // Fail open: a limiter outage must not take the forms down with it.
    console.error(`[rate-limit] ${bucket}:`, error.message)
    return true
  }
  return data === true
}

/** Records one attempt; false when the IP (5 an hour) or the email (5 a day) is over the limit. */
export async function allowRequest(request: Request, action: RateLimitedAction, email?: string | null): Promise<boolean> {
  if (!(await hit(`${action}:ip`, clientIp(request), PER_IP.limit, PER_IP.windowSeconds))) return false
  if (email && !(await hit(`${action}:email`, email, PER_EMAIL.limit, PER_EMAIL.windowSeconds))) return false
  return true
}
