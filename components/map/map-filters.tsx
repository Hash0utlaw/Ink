"use client"

import type { ReactNode } from "react"
import { Slider } from "@/components/ui/slider"
import { StyleSymbol } from "@/components/brand/style-symbol"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

interface MapFiltersProps {
  filters: {
    locationType: "all" | "artist" | "shop"
    styles: string[]
    priceRange: string[]
    rating: number
    radius: number
    availableNow: boolean
  }
  onFilterChange: (filters: any) => void
}

const LOCATION_TYPES: { value: "all" | "artist" | "shop"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "shop", label: "Shops" },
  { value: "artist", label: "Artists" },
]

const PRICE_RANGES = [
  { value: "low", label: "Low ($)" },
  { value: "medium", label: "Medium ($$)" },
  { value: "high", label: "High ($$$)" },
]

/** Filter chip: the StyleBadge look; active is ink with vellum text. */
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-lg border-1.5 border-ink px-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        active ? "bg-ink text-vellum" : "bg-vellum text-ink hover:bg-secondary"
      )}
    >
      {children}
    </button>
  )
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="flex w-full items-baseline justify-between text-sm font-semibold text-ink">
        {title}
        {aside && <span className="font-normal tabular-nums text-ink-muted">{aside}</span>}
      </legend>
      <div className="mt-2">{children}</div>
    </fieldset>
  )
}

export function MapFilters({ filters, onFilterChange }: MapFiltersProps) {
  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  const clearAllFilters = () => {
    onFilterChange({
      locationType: "all",
      styles: [],
      priceRange: [],
      rating: 0,
      radius: 25,
      availableNow: false,
    })
  }

  const hasActiveFilters =
    filters.locationType !== "all" ||
    filters.styles.length > 0 ||
    filters.priceRange.length > 0 ||
    filters.rating > 0 ||
    filters.availableNow

  return (
    <div className="space-y-5">
      <Section title="Show">
        <div className="flex flex-wrap gap-1.5">
          {LOCATION_TYPES.map(({ value, label }) => (
            <Chip
              key={value}
              active={filters.locationType === value}
              onClick={() => onFilterChange({ locationType: value })}
            >
              {label}
            </Chip>
          ))}
          <Chip active={filters.availableNow} onClick={() => onFilterChange({ availableNow: !filters.availableNow })}>
            Open now
          </Chip>
        </div>
      </Section>

      <Section title="Styles" aside={filters.styles.length > 0 ? `${filters.styles.length} selected` : undefined}>
        <div className="flex flex-wrap gap-1.5">
          {STYLES.map((style) => {
            const active = filters.styles.includes(style.slug)
            return (
              <Chip
                key={style.slug}
                active={active}
                onClick={() => onFilterChange({ styles: toggle(filters.styles, style.slug) })}
              >
                {/* Vellum backing keeps ink symbols visible on an active (ink) chip. */}
                <span className={cn("flex rounded-sm", active && "bg-vellum p-px")}>
                  <StyleSymbol slug={style.slug} size={12} />
                </span>
                {style.label}
              </Chip>
            )
          })}
        </div>
      </Section>

      <Section title="Price">
        <div className="flex flex-wrap gap-1.5">
          {PRICE_RANGES.map(({ value, label }) => (
            <Chip
              key={value}
              active={filters.priceRange.includes(value)}
              onClick={() => onFilterChange({ priceRange: toggle(filters.priceRange, value) })}
            >
              {label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Minimum rating" aside={filters.rating > 0 ? `${filters.rating}+` : "Any"}>
        <Slider
          value={[filters.rating]}
          onValueChange={(value) => onFilterChange({ rating: value[0] })}
          max={5}
          min={0}
          step={0.5}
          aria-label="Minimum rating"
          className="py-3"
        />
      </Section>

      <Section title="Distance from you" aside={`${filters.radius} mi`}>
        <Slider
          value={[filters.radius]}
          onValueChange={(value) => onFilterChange({ radius: value[0] })}
          max={50}
          min={1}
          step={1}
          aria-label="Distance from you"
          className="py-3"
        />
        <p className="text-[13px] text-ink-muted">Applies after you use your location.</p>
      </Section>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="min-h-11 text-[15px] font-semibold text-navy underline underline-offset-2 hover:no-underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}
