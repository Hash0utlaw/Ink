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
        <Link href="/find-artist" className="text-[#7C3AED] hover:underline font-medium inline-flex items-center gap-1">
          <Wand2 className="w-3.5 h-3.5" />
          Try our Artist Finder
        </Link>
      </p>
    )
  }

  return (
    <Link
      href="/find-artist"
      className="group flex items-center justify-between gap-4 rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/5 px-5 py-4 hover:bg-[#7C3AED]/10 hover:border-[#7C3AED]/50 transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-[#7C3AED]/20 p-2 shrink-0">
          <Wand2 className="w-4 h-4 text-[#7C3AED]" />
        </div>
        <div>
          <p className="font-semibold text-sm">Not sure who to pick?</p>
          <p className="text-xs text-muted-foreground">Answer 4 quick questions — we'll find your perfect artist.</p>
        </div>
      </div>
      <span className="text-sm font-medium text-[#7C3AED] shrink-0 group-hover:translate-x-0.5 transition-transform">
        Try the Artist Finder →
      </span>
    </Link>
  )
}
