"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Navigation } from "lucide-react"
import { FIELD_CLASS, FilterGroup, StyleChips } from "@/components/listings/filter-controls"


const US_STATES = [
  { value: "TX", label: "Texas (975)" },
  { value: "CA", label: "California (823)" },
  { value: "FL", label: "Florida (778)" },
  { value: "NC", label: "North Carolina (409)" },
  { value: "LA", label: "Louisiana (201)" },
  { value: "NV", label: "Nevada (172)" },
  { value: "NY", label: "New York (38)" },
  { value: "DC", label: "Washington D.C. (23)" },
  { value: "MD", label: "Maryland (18)" },
  { value: "PA", label: "Pennsylvania (18)" },
  { value: "VA", label: "Virginia (13)" },
  { value: "NJ", label: "New Jersey (13)" },
]

interface ShopFilters {
  styles: string[]
  rating: number
  acceptsWalkIns: boolean
  zip?: string
  state?: string
  city?: string
  query?: string
  sortBy?: 'rating' | 'review_count' | 'name'
  radiusMiles?: number
}

interface ShopFilterSidebarProps {
  filters: ShopFilters
  onFilterChange: (filters: ShopFilters) => void
  onNearMe?: (lat: number, lng: number) => void
}

export function ShopFilterSidebar({ filters, onFilterChange, onNearMe }: ShopFilterSidebarProps) {
  const [locating, setLocating] = useState(false)
  const [nearMeActive, setNearMeActive] = useState(false)
  const [locationError, setLocationError] = useState(false)

  const handleStyleChange = (style: string) => {
    const newStyles = filters.styles.includes(style)
      ? filters.styles.filter((s: string) => s !== style)
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
    (filters.query && filters.query !== '') ||
    (filters.zip && filters.zip !== '') ||
    (filters.state && filters.state !== '') ||
    (filters.city && filters.city !== '') ||
    filters.rating > 0 ||
    filters.acceptsWalkIns ||
    (filters.styles && filters.styles.length > 0) ||
    (filters.sortBy && filters.sortBy !== 'rating') ||
    nearMeActive

  return (
    <div className="space-y-6">
      <FilterGroup label="Search by name" htmlFor="shop-query">
        <Input
          id="shop-query"
          placeholder="e.g. Black Oak Tattoo"
          value={filters.query ?? ''}
          onChange={(e) => onFilterChange({ ...filters, query: e.target.value })}
          className={FIELD_CLASS}
        />
      </FilterGroup>

      <div className="space-y-3">
        <FilterGroup label="ZIP code" htmlFor="shop-zip">
          <Input
            id="shop-zip"
            placeholder="75201"
            maxLength={5}
            inputMode="numeric"
            value={filters.zip ?? ''}
            onChange={(e) => onFilterChange({ ...filters, zip: e.target.value })}
            className={FIELD_CLASS}
          />
        </FilterGroup>

        <FilterGroup label="City" htmlFor="shop-city">
          <Input
            id="shop-city"
            placeholder="Austin"
            value={filters.city ?? ''}
            onChange={(e) => onFilterChange({ ...filters, city: e.target.value })}
            className={FIELD_CLASS}
          />
        </FilterGroup>

        <FilterGroup label="State">
          <Select
            value={filters.state || 'all'}
            onValueChange={(value) => onFilterChange({ ...filters, state: value === 'all' ? '' : value })}
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

        <Button
          variant="outline"
          className="min-h-11 w-full rounded border-1.5 border-ink bg-vellum tex-vellum text-[15px] font-semibold text-ink hover:bg-secondary"
          onClick={handleNearMe}
          disabled={locating}
        >
          <Navigation className="mr-2 h-4 w-4" />
          {locating ? 'Locating...' : 'Near me'}
        </Button>
        {locationError && <p className="text-sm text-ink-muted">Location not available</p>}

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
          value={filters.sortBy ?? 'rating'}
          onValueChange={(value) => onFilterChange({ ...filters, sortBy: value as 'rating' | 'review_count' | 'name' })}
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

      {/* No shop has walk-in data yet, so this switch only ever empties the list.
          Hidden until shops set it; ?acceptsWalkIns=true still filters. */}
      <div className="hidden min-h-11 items-center justify-between">
        <Label htmlFor="accepts-walkins" className="text-sm font-semibold text-ink">Accepts walk-ins</Label>
        <Switch
          id="accepts-walkins"
          checked={filters.acceptsWalkIns}
          onCheckedChange={(checked) => onFilterChange({ ...filters, acceptsWalkIns: checked })}
        />
      </div>

      {hasActiveFilters && (
        <button
          className="min-h-11 text-[15px] font-semibold text-navy underline underline-offset-2 hover:no-underline"
          onClick={() => {
            setNearMeActive(false)
            setLocationError(false)
            onFilterChange({
              styles: [], rating: 0, acceptsWalkIns: false,
              zip: '', state: '', city: '', query: '', sortBy: 'rating'
            })
          }}
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}
