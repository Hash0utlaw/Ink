import type { SocialLink } from "@/lib/socials"
import { SocialIcon } from "./social-icon"

/**
 * "Follow": one row per network the place actually has, each an outline icon,
 * the handle or page name, and "Instagram, 12.4K followers" (a count only when
 * we have one). Opens in a new tab. Renders nothing without links.
 */
export function FollowList({ links, className }: { links: SocialLink[]; className?: string }) {
  if (links.length === 0) return null
  return (
    <div className={className}>
      <h3 className="pb-1.5 text-[13px] font-semibold text-ink">Follow</h3>
      <ul>
        {links.map((link) => (
          <li key={link.network} className="border-t border-rule">
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-3 py-1.5 text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border-1.5 border-ink bg-vellum tex-vellum">
                <SocialIcon network={link.network} />
              </span>
              <span className="flex min-w-0 flex-col gap-px">
                <span className="truncate text-[15px] font-semibold">{link.label}</span>
                <span className="text-[13px] tabular-nums text-ink-muted">{link.detail}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
