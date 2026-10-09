"use client"

import { useState } from "react"
import { StyleBadge } from "@/components/brand/style-badge"
import { styleEntries } from "@/lib/styles"

/** The artist's style badges: the first `max`, then "+n more" that shows the rest in place. */
export function StyleBadgeList({ styles, max = 4 }: { styles: string[]; max?: number }) {
  const [expanded, setExpanded] = useState(false)
  const entries = styleEntries(styles)
  const shown = expanded ? entries : entries.slice(0, max)
  const hidden = entries.length - shown.length

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map(({ slug, label }) => (
        <StyleBadge key={slug} slug={slug} label={label} />
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="min-h-11 px-1 text-sm font-semibold text-navy underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          +{hidden} more
        </button>
      )}
    </div>
  )
}
