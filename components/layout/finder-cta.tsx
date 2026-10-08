import Link from "next/link"
import { Wand2 } from "lucide-react"

interface FinderCtaProps {
  variant?: "banner" | "inline"
}

export function FinderCta({ variant = "banner" }: FinderCtaProps) {
  if (variant === "inline") {
    return (
      <p className="text-sm text-muted-foreground">
        Not sure where to start?{" "}
        <Link href="/find-artist" className="text-navy underline-offset-2 hover:underline font-medium inline-flex items-center gap-1">
          <Wand2 className="w-3.5 h-3.5" />
          Try our Artist Finder
        </Link>
      </p>
    )
  }

  return (
    <Link
      href="/find-artist"
      className="group flex items-center justify-between gap-4 rounded-lg border border-ink bg-secondary px-5 py-4 hover:bg-secondary hover:border-ink transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-secondary p-2 shrink-0">
          <Wand2 className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm">Not sure who to pick?</p>
          <p className="text-xs text-muted-foreground">Answer 4 quick questions — we'll find your perfect artist.</p>
        </div>
      </div>
      <span className="text-sm font-medium text-navy shrink-0 group-hover:translate-x-0.5 transition-transform">
        Try the Artist Finder →
      </span>
    </Link>
  )
}
