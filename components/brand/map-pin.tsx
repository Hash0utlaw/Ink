import { cn } from "@/lib/utils"

// Pins and seals (docs/design/brand-pieces-reference.html, "Pins and seals").
// Pin: 34px circle, 2px ink border, Libre Franklin 700, tabular numbers.
// Default vellum; selected flash red with a white number.
// Seal: 46px flash yellow, 2px ink border, inner ring (3px vellum + 1.5px ink).
// For Mapbox layers use the hex values in lib/brand-colors.ts.

interface MapPinProps {
  number: number | string
  selected?: boolean
  className?: string
}

export function MapPin({ number, selected = false, className }: MapPinProps) {
  return (
    <span
      className={cn(
        "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-2 border-ink font-sans text-sm font-bold tabular-nums",
        selected ? "bg-flash-red text-white" : "bg-vellum text-ink",
        className
      )}
    >
      {number}
    </span>
  )
}

/** 1,000 and up read as "1k", "2k", "10k" so the number always fits the seal. */
export function formatSealCount(count: number | string): string {
  const n = typeof count === "number" ? count : Number(count)
  if (!Number.isFinite(n) || n < 1000) return String(count)
  return `${Math.floor(n / 1000)}k`
}

export function ClusterSeal({ count, className }: { count: number | string; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border-2 border-ink bg-flash-yellow font-sans text-[15px] font-bold tabular-nums text-ink",
        "shadow-[inset_0_0_0_3px_hsl(var(--vellum)),inset_0_0_0_4.5px_hsl(var(--ink))]",
        className
      )}
    >
      {formatSealCount(count)}
    </span>
  )
}
