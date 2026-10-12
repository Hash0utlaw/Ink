"use client"

import type { ReactNode } from "react"
import { X } from "lucide-react"
import { StyleSymbol } from "@/components/brand/style-symbol"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

/** White field, 1.5px ink outline, 44px tall: inputs and select triggers in the filters. */
export const FIELD_CLASS =
  "min-h-11 rounded border-1.5 border-ink bg-white text-[15px] text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"

/** A filter group: a plain label above its controls. */
export function FilterGroup({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
          {label}
        </label>
      ) : (
        <p className="text-sm font-semibold text-ink">{label}</p>
      )}
      {children}
    </div>
  )
}

/** A toggle chip in the StyleBadge look; pressed = ink fill, vellum text. */
export function FilterChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded border-1.5 border-ink px-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        pressed ? "bg-ink text-vellum" : "bg-vellum tex-vellum text-ink hover:bg-secondary",
      )}
    >
      {children}
    </button>
  )
}

/** All 21 styles as toggle chips with their symbols. */
export function StyleChips({ selected, onToggle }: { selected: string[]; onToggle: (slug: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STYLES.map((style) => (
        <FilterChip key={style.slug} pressed={selected.includes(style.slug)} onClick={() => onToggle(style.slug)}>
          {/* A vellum backing keeps solid-ink symbols visible on the pressed (ink) chip. */}
          <span className={cn("inline-flex shrink-0 rounded-[2px]", selected.includes(style.slug) && "bg-vellum p-px")}>
            <StyleSymbol slug={style.slug} size={12} />
          </span>
          {style.label}
        </FilterChip>
      ))}
    </div>
  )
}

/** An applied filter above the results, with a button that removes it. */
export function ActiveFilter({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex min-h-11 items-center gap-1 rounded border-1.5 border-ink bg-ink pl-2.5 text-sm font-semibold text-vellum">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="inline-flex h-11 w-11 items-center justify-center rounded-r hover:bg-ink/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  )
}
