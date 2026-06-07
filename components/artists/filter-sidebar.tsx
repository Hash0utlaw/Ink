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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Filter, Navigation } from "lucide-react"

const tattooStyles = [
  "Fine Line",
  "Botanical",
  "Blackwork",
  "Japanese",
  "Irezumi",
  "Watercolor",
  "Abstract",
  "Traditional",
  "Old School",
]

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
}

export function FilterSidebar({ filters, onFilterChange, onNearMe }: FilterSidebarProps) {
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
    <Card className="sticky top-20 bg-muted/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="text-accent" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Search by name</Label>
          <Input
            placeholder="e.g. Jane Ink"
            value={filters.query}
            onChange={(e) => onFilterChange({ ...filters, query: e.target.value })}
          />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location</p>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">ZIP Code</Label>
            <Input
              placeholder="75201"
              maxLength={5}
              inputMode="numeric"
              value={filters.zip}
              onChange={(e) => onFilterChange({ ...filters, zip: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">City</Label>
            <Input
              placeholder="Austin"
              value={filters.city}
              onChange={(e) => onFilterChange({ ...filters, city: e.target.value })}
            />
          </div>

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

        <div className="space-y-2">
          <Label>Styles</Label>
          <div className="space-y-2">
            {tattooStyles.map((style) => (
              <div key={style} className="flex items-center space-x-2">
                <Checkbox
                  id={`artist-${style}`}
                  checked={filters.styles.includes(style)}
                  onCheckedChange={() => handleStyleChange(style)}
                />
                <label
                  htmlFor={`artist-${style}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {style}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
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

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Sort by</Label>
          <Select
            value={filters.sortBy}
            onValueChange={(value) =>
              onFilterChange({ ...filters, sortBy: value as "rating" | "review_count" | "name" })
            }
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

        <div className="flex items-center justify-between">
          <Label htmlFor="available-now">Available Now</Label>
          <Switch
            id="available-now"
            checked={filters.availableNow}
            onCheckedChange={(checked) => onFilterChange({ ...filters, availableNow: checked })}
          />
        </div>

        {hasActiveFilters && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors w-full text-left"
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

      </CardContent>
    </Card>
  )
}
