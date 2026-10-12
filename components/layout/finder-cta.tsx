import Link from "next/link"

interface FinderCtaProps {
  variant?: "banner" | "inline"
}

export function FinderCta({ variant = "banner" }: FinderCtaProps) {
  if (variant === "inline") {
    return (
      <p className="text-[15px] text-ink-muted">
        Not sure where to start?{" "}
        <Link href="/find-artist" className="inline-flex min-h-11 items-center gap-1 font-semibold text-navy underline underline-offset-2 hover:no-underline">
          Try the artist finder
        </Link>
      </p>
    )
  }

  return (
    <Link
      href="/find-artist"
      className="group flex items-center justify-between gap-4 rounded border border-ink bg-secondary px-5 py-4 hover:bg-secondary hover:border-ink transition-all"
    >
      <div>
        <p className="font-semibold text-sm">Not sure who to pick?</p>
        <p className="text-xs text-muted-foreground">Answer two quick questions and see every artist near you.</p>
      </div>
      <span className="text-sm font-semibold text-navy underline underline-offset-2 shrink-0">
        Try the artist finder
      </span>
    </Link>
  )
}
