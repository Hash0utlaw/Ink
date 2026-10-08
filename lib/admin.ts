/** True when `email` is listed in ADMIN_EMAILS (comma-separated, case-insensitive). */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return admins.includes(email.trim().toLowerCase())
}

/**
 * /admin/design (the brand component reference) is open without signing in on
 * Vercel preview deployments and in local development. Production keeps the
 * normal admin check.
 */
export function isDesignReferenceOpen(): boolean {
  return process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development"
}
