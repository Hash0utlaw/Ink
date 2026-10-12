import Link from "next/link"
import type { ALL_STYLES } from "@/app/styles/page"
import { GuideSymbol } from "./guide-symbol"

interface StyleCardProps {
  style: (typeof ALL_STYLES)[number]
  /** The exact master style, or null (plain outline circle). */
  masterSlug: string | null
  /** Real artist count; hidden when missing or 0. */
  artistCount: number | null
}

/** A style on the /styles index: symbol, name, short description and the real artist count. */
export function StyleCard({ style, masterSlug, artistCount }: StyleCardProps) {
  return (
    <Link
      href={`/styles/${style.slug}`}
      className="flex h-full gap-4 rounded border-1.5 border-ink bg-vellum tex-vellum p-5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <GuideSymbol masterSlug={masterSlug} size={32} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <h2 className="font-heading text-[22px] leading-[1.15] text-ink text-balance">{style.name}</h2>
        <p className="mt-1.5 text-[15px] leading-[1.55] text-ink-muted text-pretty">{style.description}</p>
        {artistCount != null && artistCount > 0 && (
          <p className="mt-2 text-sm font-semibold tabular-nums text-ink">
            {artistCount.toLocaleString("en-US")} {artistCount === 1 ? "artist" : "artists"}
          </p>
        )}
      </div>
    </Link>
  )
}
