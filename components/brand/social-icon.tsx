import type { SocialNetwork } from "@/lib/socials"

/** Outline network icons from the Round 10 boards: 24px grid, 1.8px stroke in the current color. */
export function SocialIcon({ network, size = 18, className }: { network: SocialNetwork; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {network === "instagram" && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </>
      )}
      {network === "tiktok" && (
        <>
          <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
          <path d="M14 3c.5 2.8 2.4 4.6 5 5" />
        </>
      )}
      {network === "facebook" && <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" />}
      {network === "youtube" && (
        <>
          <rect x="2.5" y="6" width="19" height="12" rx="3" />
          <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" />
        </>
      )}
    </svg>
  )
}
