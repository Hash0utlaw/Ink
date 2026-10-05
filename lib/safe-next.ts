/**
 * Returns `next` only when it's a path on this site ("/..." but not "//..." or
 * "/\\..."), otherwise null. Guards post-auth redirects against open redirects.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null
  return next
}
