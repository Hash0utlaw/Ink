"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Plus, Minus } from "lucide-react"

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

const tattooStyles = [
  "Traditional",
  "Realism",
  "Japanese",
  "Geometric",
  "Watercolor",
  "Blackwork",
  "Fine Line",
  "Neo-Traditional",
  "Tribal",
  "Minimalist",
  "Portrait",
  "Abstract",
  "Botanical",
  "Irezumi",
]

export function MapFilters({ filters, onFilterChange }: MapFiltersProps) {
  const [openSections, setOpenSections] = useState({
    type: true,
    styles: false,
    price: false,
    rating: false,
    distance: false,
    availability: false,
  })

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const handleLocationTypeChange = (type: "all" | "artist" | "shop") => {
    onFilterChange({ locationType: type })
  }

  const handleStyleToggle = (style: string) => {
    const newStyles = filters.styles.includes(style)
      ? filters.styles.filter((s) => s !== style)
      : [...filters.styles, style]
    onFilterChange({ styles: newStyles })
  }

  const handlePriceRangeToggle = (range: string) => {
    const newPriceRange = filters.priceRange.includes(range)
      ? filters.priceRange.filter((r) => r !== range)
      : [...filters.priceRange, range]
    onFilterChange({ priceRange: newPriceRange })
  }

  const handleRatingChange = (rating: number[]) => {
    onFilterChange({ rating: rating[0] })
  }

  const handleRadiusChange = (radius: number[]) => {
    onFilterChange({ radius: radius[0] })
  }

  const handleAvailabilityToggle = () => {
    onFilterChange({ availableNow: !filters.availableNow })
  }

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
    <div className="space-y-6">
      {hasActiveFilters && (
        <div className="flex justify-between items-center pb-4 border-b border-sidebar-border/30">
          <span className="text-sm font-semibold text-sidebar-text-primary">Active Filters</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs text-sidebar-text-secondary hover:text-sidebar-text-primary h-auto p-2"
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Location Type */}
      <Collapsible open={openSections.type} onOpenChange={() => toggleSection("type")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-semibold text-sidebar-text-primary hover:text-accent transition-colors py-2">
          Location Type
          {openSections.type ? (
            <Minus className="w-4 h-4 text-sidebar-text-secondary" />
          ) : (
            <Plus className="w-4 h-4 text-sidebar-text-secondary" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {["all", "artist", "shop"].map((type) => (
              <Button
                key={type}
                variant={filters.locationType === type ? "default" : "outline"}
                size="sm"
                onClick={() => handleLocationTypeChange(type as "all" | "artist" | "shop")}
                className="text-xs font-medium capitalize h-9"
              >
                {type === "all" ? "All" : type}
              </Button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Tattoo Styles */}
      <Collapsible open={openSections.styles} onOpenChange={() => toggleSection("styles")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-semibold text-sidebar-text-primary hover:text-accent transition-colors py-2">
          <div className="flex items-center gap-2">
            Tattoo Styles
            {filters.styles.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-2">
                {filters.styles.length}
              </Badge>
            )}
          </div>
          {openSections.styles ? (
            <Minus className="w-4 h-4 text-sidebar-text-secondary" />
          ) : (
            <Plus className="w-4 h-4 text-sidebar-text-secondary" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto scrollbar-ink">
            {tattooStyles.map((style) => (
              <div key={style} className="flex items-center space-x-3">
                <Checkbox
                  id={style}
                  checked={filters.styles.includes(style)}
                  onCheckedChange={() => handleStyleToggle(style)}
                  className="rounded"
                />
                <label htmlFor={style} className="text-xs text-sidebar-text-primary cursor-pointer font-medium">
                  {style}
                </label>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Price Range */}
      <Collapsible open={openSections.price} onOpenChange={() => toggleSection("price")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-semibold text-sidebar-text-primary hover:text-accent transition-colors py-2">
          <div className="flex items-center gap-2">
            Price Range
            {filters.priceRange.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-2">
                {filters.priceRange.length}
              </Badge>
            )}
          </div>
          {openSections.price ? (
            <Minus className="w-4 h-4 text-sidebar-text-secondary" />
          ) : (
            <Plus className="w-4 h-4 text-sidebar-text-secondary" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-3">
          {["low", "medium", "high"].map((range) => (
            <div key={range} className="flex items-center space-x-3">
              <Checkbox
                id={range}
                checked={filters.priceRange.includes(range)}
                onCheckedChange={() => handlePriceRangeToggle(range)}
                className="rounded"
              />
              <label
                htmlFor={range}
                className="text-xs text-sidebar-text-primary cursor-pointer capitalize font-medium"
              >
                {range} ({range === "low" ? "$" : range === "medium" ? "$$" : "$$$"})
              </label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Rating */}
      <Collapsible open={openSections.rating} onOpenChange={() => toggleSection("rating")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-semibold text-sidebar-text-primary hover:text-accent transition-colors py-2">
          <div className="flex items-center gap-2">
            Minimum Rating
            {filters.rating > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-2">
                {filters.rating}+
              </Badge>
            )}
          </div>
          {openSections.rating ? (
            <Minus className="w-4 h-4 text-sidebar-text-secondary" />
          ) : (
            <Plus className="w-4 h-4 text-sidebar-text-secondary" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <div className="px-3 py-2">
            <Slider
              value={[filters.rating]}
              onValueChange={handleRatingChange}
              max={5}
              min={0}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-sidebar-text-secondary mt-3 font-medium">
              <span>Any rating</span>
              <span>{filters.rating}+ stars</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Distance */}
      <Collapsible open={openSections.distance} onOpenChange={() => toggleSection("distance")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-semibold text-sidebar-text-primary hover:text-accent transition-colors py-2">
          <div className="flex items-center gap-2">
            Distance
            <Badge variant="secondary" className="text-xs h-5 px-2">
              {filters.radius} mi
            </Badge>
          </div>
          {openSections.distance ? (
            <Minus className="w-4 h-4 text-sidebar-text-secondary" />
          ) : (
            <Plus className="w-4 h-4 text-sidebar-text-secondary" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <div className="px-3 py-2">
            <Slider
              value={[filters.radius]}
              onValueChange={handleRadiusChange}
              max={50}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-sidebar-text-secondary mt-3 font-medium">
              <span>1 mile</span>
              <span>{filters.radius} miles</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Availability */}
      <Collapsible open={openSections.availability} onOpenChange={() => toggleSection("availability")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-semibold text-sidebar-text-primary hover:text-accent transition-colors py-2">
          <div className="flex items-center gap-2">
            Availability
            {filters.availableNow && (
              <Badge variant="secondary" className="text-xs h-5 px-2">
                Open Now
              </Badge>
            )}
          </div>
          {openSections.availability ? (
            <Minus className="w-4 h-4 text-sidebar-text-secondary" />
          ) : (
            <Plus className="w-4 h-4 text-sidebar-text-secondary" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="availableNow"
              checked={filters.availableNow}
              onCheckedChange={handleAvailabilityToggle}
              className="rounded"
            />
            <label htmlFor="availableNow" className="text-xs text-sidebar-text-primary cursor-pointer font-medium">
              Show only locations open now
            </label>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
