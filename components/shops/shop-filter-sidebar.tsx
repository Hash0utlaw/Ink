"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, Navigation } from "lucide-react"

const shopSpecialties = ["Fine Line", "Botanical", "Blackwork", "Japanese", "Irezumi", "Watercolor", "Traditional"]

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
    <Card className="sticky top-20 bg-muted/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="text-accent" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ADD 1 — Name search */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Search by name</Label>
          <Input
            placeholder="e.g. Black Oak Tattoo"
            value={filters.query ?? ''}
            onChange={(e) => onFilterChange({ ...filters, query: e.target.value })}
          />
        </div>

        {/* ADD 2–7 — Location section */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location</p>

          {/* ADD 3 — ZIP */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">ZIP Code</Label>
            <Input
              placeholder="75201"
              maxLength={5}
              inputMode="numeric"
              value={filters.zip ?? ''}
              onChange={(e) => onFilterChange({ ...filters, zip: e.target.value })}
            />
          </div>

          {/* ADD 4 — City */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">City</Label>
            <Input
              placeholder="Austin"
              value={filters.city ?? ''}
              onChange={(e) => onFilterChange({ ...filters, city: e.target.value })}
            />
          </div>

          {/* ADD 5 — State */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">State</Label>
            <Select
              value={filters.state || "all"}
              onValueChange={(value) => onFilterChange({ ...filters, state: value === "all" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {US_STATES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ADD 6 — Near Me */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleNearMe}
            disabled={locating}
          >
            <Navigation className="w-4 h-4 mr-2" />
            {locating ? "Locating..." : "Near Me"}
          </Button>
          {locationError && (
            <p className="text-xs text-muted-foreground">Location not available</p>
          )}

          {/* ADD 7 — Radius (only when Near Me active) */}
          {nearMeActive && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Radius</Label>
              <Select
                value={String(filters.radiusMiles ?? 25)}
                onValueChange={(value) => onFilterChange({ ...filters, radiusMiles: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 mi</SelectItem>
                  <SelectItem value="10">10 mi</SelectItem>
                  <SelectItem value="25">25 mi</SelectItem>
                  <SelectItem value="50">50 mi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Existing — Shop Specialties */}
        <div className="space-y-2">
          <Label>Shop Specialties</Label>
          <div className="space-y-2">
            {shopSpecialties.map((style) => (
              <div key={style} className="flex items-center space-x-2">
                <Checkbox
                  id={`shop-${style}`}
                  checked={filters.styles.includes(style)}
                  onCheckedChange={() => handleStyleChange(style)}
                />
                <label
                  htmlFor={`shop-${style}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {style}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Existing — Minimum Rating */}
        <div className="space-y-2">
          <Label>Minimum Rating</Label>
          <Slider
            min={0}
            max={5}
            step={0.1}
            value={[filters.rating]}
            onValueChange={(value) => onFilterChange({ ...filters, rating: value[0] })}
          />
          <div className="text-xs text-muted-foreground text-right">{filters.rating.toFixed(1)} stars & up</div>
        </div>

        {/* ADD 8 — Sort by */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Sort by</Label>
          <Select
            value={filters.sortBy ?? 'rating'}
            onValueChange={(value) => onFilterChange({ ...filters, sortBy: value as 'rating' | 'review_count' | 'name' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Best Rated</SelectItem>
              <SelectItem value="review_count">Most Reviewed</SelectItem>
              <SelectItem value="name">A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Existing — Walk-ins */}
        <div className="flex items-center justify-between">
          <Label htmlFor="accepts-walkins">Accepts Walk-ins</Label>
          <Switch
            id="accepts-walkins"
            checked={filters.acceptsWalkIns}
            onCheckedChange={(checked) => onFilterChange({ ...filters, acceptsWalkIns: checked })}
          />
        </div>

        {/* ADD 9 — Clear all filters */}
        {hasActiveFilters && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors w-full text-left"
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

      </CardContent>
    </Card>
  )
}
