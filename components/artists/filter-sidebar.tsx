"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Navigation } from "lucide-react"
import { FIELD_CLASS, FilterGroup, StyleChips } from "@/components/listings/filter-controls"


const US_STATES = [
  { value: "TX", label: "Texas" },
  { value: "CA", label: "California" },
  { value: "FL", label: "Florida" },
  { value: "NC", label: "North Carolina" },
  { value: "LA", label: "Louisiana" },
  { value: "NV", label: "Nevada" },
  { value: "NY", label: "New York" },
  { value: "DC", label: "Washington D.C." },
  { value: "MD", label: "Maryland" },
  { value: "PA", label: "Pennsylvania" },
  { value: "VA", label: "Virginia" },
  { value: "NJ", label: "New Jersey" },
  { value: "IL", label: "Illinois" },
  { value: "AZ", label: "Arizona" },
  { value: "CO", label: "Colorado" },
  { value: "OR", label: "Oregon" },
  { value: "WA", label: "Washington" },
  { value: "GA", label: "Georgia" },
  { value: "TN", label: "Tennessee" },
  { value: "OH", label: "Ohio" },
]

export interface ArtistFilterValues {
  styles: string[]
  price: string[]
  rating: number
  availableNow: boolean
  query: string
  city: string
  state: string
  zip: string
  sortBy: "rating" | "review_count" | "name"
  radiusMiles: number
}

interface FilterSidebarProps {
  filters: ArtistFilterValues
  onFilterChange: (filters: ArtistFilterValues) => void
  onNearMe?: (lat: number, lng: number) => void
  /** The "Available now" switch. Off until any artist is claimed (availability is a default until then). */
  showAvailableNow?: boolean
}

export function FilterSidebar({ filters, onFilterChange, onNearMe, showAvailableNow = false }: FilterSidebarProps) {
  const [locating, setLocating] = useState(false)
  const [nearMeActive, setNearMeActive] = useState(false)
  const [locationError, setLocationError] = useState(false)

  const handleStyleChange = (style: string) => {
    const newStyles = filters.styles.includes(style)
      ? filters.styles.filter((s) => s !== style)
      : [...filters.styles, style]
    onFilterChange({ ...filters, styles: newStyles })
  }

  const handleNearMe = () => {
    setLocating(true)
    setLocationError(false)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        onNearMe?.(pos.coords.latitude, pos.coords.longitude)
        setNearMeActive(true)
      },
      () => {
        setLocating(false)
        setLocationError(true)
      }
    )
  }

  const hasActiveFilters =
    (filters.query && filters.query !== "") ||
    (filters.zip && filters.zip !== "") ||
    (filters.state && filters.state !== "") ||
    (filters.city && filters.city !== "") ||
    filters.rating > 0 ||
    filters.availableNow ||
    filters.styles.length > 0 ||
    filters.price.length > 0 ||
    (filters.sortBy && filters.sortBy !== "rating") ||
    nearMeActive

  return (
    <div className="space-y-6">
      <FilterGroup label="Search by name" htmlFor="artist-query">
        <Input
          id="artist-query"
          placeholder="e.g. Jane Ink"
          value={filters.query}
          onChange={(e) => onFilterChange({ ...filters, query: e.target.value })}
          className={FIELD_CLASS}
        />
      </FilterGroup>

      <div className="space-y-3">
        <FilterGroup label="ZIP code" htmlFor="artist-zip">
          <Input
            id="artist-zip"
            placeholder="75201"
            maxLength={5}
            inputMode="numeric"
            value={filters.zip}
            onChange={(e) => onFilterChange({ ...filters, zip: e.target.value })}
            className={FIELD_CLASS}
          />
        </FilterGroup>

        <FilterGroup label="City" htmlFor="artist-city">
          <Input
            id="artist-city"
            placeholder="Austin"
            value={filters.city}
            onChange={(e) => onFilterChange({ ...filters, city: e.target.value })}
            className={FIELD_CLASS}
          />
        </FilterGroup>

        <FilterGroup label="State">
          <Select
            value={filters.state || "all"}
            onValueChange={(value) => onFilterChange({ ...filters, state: value === "all" ? "" : value })}
          >
            <SelectTrigger className={FIELD_CLASS} aria-label="State">
              <SelectValue placeholder="All states" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {US_STATES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterGroup>

        {onNearMe && (
          <Button
            variant="outline"
            className="min-h-11 w-full rounded border-1.5 border-ink bg-vellum tex-vellum text-[15px] font-semibold text-ink hover:bg-secondary"
            onClick={handleNearMe}
            disabled={locating}
          >
            <Navigation className="mr-2 h-4 w-4" />
            {locating ? "Locating..." : "Near me"}
          </Button>
        )}
        {locationError && (
          <p className="text-sm text-ink-muted">Location not available</p>
        )}

        {nearMeActive && (
          <FilterGroup label="Radius">
            <Select
              value={String(filters.radiusMiles ?? 25)}
              onValueChange={(value) => onFilterChange({ ...filters, radiusMiles: Number(value) })}
            >
              <SelectTrigger className={FIELD_CLASS} aria-label="Radius">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 mi</SelectItem>
                <SelectItem value="10">10 mi</SelectItem>
                <SelectItem value="25">25 mi</SelectItem>
                <SelectItem value="50">50 mi</SelectItem>
              </SelectContent>
            </Select>
          </FilterGroup>
        )}
      </div>

      <FilterGroup label="Styles">
        <StyleChips selected={filters.styles} onToggle={handleStyleChange} />
      </FilterGroup>

      {/* TODO: Re-enable when claimed artists set their own price tier. */}
      <div className="hidden space-y-2">
        <Label>Price Range</Label>
        <ToggleGroup
          type="multiple"
          variant="outline"
          value={filters.price}
          onValueChange={(value) => onFilterChange({ ...filters, price: value })}
          className="w-full"
        >
          <ToggleGroupItem value="low" className="w-1/3 text-xs px-2">$</ToggleGroupItem>
          <ToggleGroupItem value="medium" className="w-1/3 text-xs px-2">$$</ToggleGroupItem>
          <ToggleGroupItem value="high" className="w-1/3 text-xs px-2">$$$</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <FilterGroup label="Minimum rating">
        <Slider
          min={0}
          max={5}
          step={0.1}
          value={[filters.rating]}
          onValueChange={(value) => onFilterChange({ ...filters, rating: value[0] })}
          aria-label="Minimum rating"
        />
        <p className="text-right text-sm tabular-nums text-ink-muted">{filters.rating.toFixed(1)} stars and up</p>
      </FilterGroup>

      <FilterGroup label="Sort by">
        <Select
          value={filters.sortBy}
          onValueChange={(value) =>
            onFilterChange({ ...filters, sortBy: value as "rating" | "review_count" | "name" })
          }
        >
          <SelectTrigger className={FIELD_CLASS} aria-label="Sort by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Best rated</SelectItem>
            <SelectItem value="review_count">Most reviewed</SelectItem>
            <SelectItem value="name">A to Z</SelectItem>
          </SelectContent>
        </Select>
      </FilterGroup>

      {showAvailableNow && (
        <div className="flex min-h-11 items-center justify-between">
          <Label htmlFor="available-now" className="text-sm font-semibold text-ink">Available now</Label>
          <Switch
            id="available-now"
            checked={filters.availableNow}
            onCheckedChange={(checked) => onFilterChange({ ...filters, availableNow: checked })}
          />
        </div>
      )}

      {hasActiveFilters && (
        <button
          className="min-h-11 text-[15px] font-semibold text-navy underline underline-offset-2 hover:no-underline"
          onClick={() => {
            setNearMeActive(false)
            setLocationError(false)
            onFilterChange({
              styles: [],
              price: [],
              rating: 0,
              availableNow: false,
              query: "",
              city: "",
              state: "",
              zip: "",
              sortBy: "rating",
              radiusMiles: 25,
            })
          }}
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}
