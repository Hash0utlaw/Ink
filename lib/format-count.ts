/**
 * A follower count, short: 950, 12.4K, 184K, 1.9M.
 * One decimal under 100K and for millions (dropped when it's .0), whole thousands from 100K.
 */
export function formatCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0"
  const oneDecimal = (x: number) => (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, "")
  if (n < 1000) return String(Math.round(n))
  if (n < 99_950) return `${oneDecimal(n / 1000)}K`
  if (n < 999_500) return `${Math.round(n / 1000)}K`
  return `${oneDecimal(n / 1_000_000)}M`
}

/** "12.4K followers", "1 follower"; null when there's no real count. */
export function followersLabel(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n) || n <= 0) return null
  return `${formatCount(n)} ${n === 1 ? "follower" : "followers"}`
}
