"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"

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
    <div className="space-y-4">
      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Active Filters</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Location Type */}
      <Collapsible open={openSections.type} onOpenChange={() => toggleSection("type")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900">
          Location Type
          {openSections.type ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          <div className="flex gap-2">
            <Button
              variant={filters.locationType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => handleLocationTypeChange("all")}
              className="text-xs"
            >
              All
            </Button>
            <Button
              variant={filters.locationType === "artist" ? "default" : "outline"}
              size="sm"
              onClick={() => handleLocationTypeChange("artist")}
              className="text-xs"
            >
              Artists
            </Button>
            <Button
              variant={filters.locationType === "shop" ? "default" : "outline"}
              size="sm"
              onClick={() => handleLocationTypeChange("shop")}
              className="text-xs"
            >
              Shops
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Tattoo Styles */}
      <Collapsible open={openSections.styles} onOpenChange={() => toggleSection("styles")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900">
          Tattoo Styles{" "}
          {filters.styles.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {filters.styles.length}
            </Badge>
          )}
          {openSections.styles ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {tattooStyles.map((style) => (
              <div key={style} className="flex items-center space-x-2">
                <Checkbox
                  id={style}
                  checked={filters.styles.includes(style)}
                  onCheckedChange={() => handleStyleToggle(style)}
                />
                <label htmlFor={style} className="text-xs text-gray-700 cursor-pointer">
                  {style}
                </label>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Price Range */}
      <Collapsible open={openSections.price} onOpenChange={() => toggleSection("price")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900">
          Price Range{" "}
          {filters.priceRange.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {filters.priceRange.length}
            </Badge>
          )}
          {openSections.price ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          {["low", "medium", "high"].map((range) => (
            <div key={range} className="flex items-center space-x-2">
              <Checkbox
                id={range}
                checked={filters.priceRange.includes(range)}
                onCheckedChange={() => handlePriceRangeToggle(range)}
              />
              <label htmlFor={range} className="text-xs text-gray-700 cursor-pointer capitalize">
                {range} ($)
              </label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Rating */}
      <Collapsible open={openSections.rating} onOpenChange={() => toggleSection("rating")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900">
          Minimum Rating{" "}
          {filters.rating > 0 && (
            <Badge variant="secondary" className="text-xs">
              {filters.rating}+
            </Badge>
          )}
          {openSections.rating ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="px-2">
            <Slider
              value={[filters.rating]}
              onValueChange={handleRatingChange}
              max={5}
              min={0}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Any</span>
              <span>{filters.rating}+ stars</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Distance */}
      <Collapsible open={openSections.distance} onOpenChange={() => toggleSection("distance")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900">
          Distance{" "}
          <Badge variant="secondary" className="text-xs">
            {filters.radius} mi
          </Badge>
          {openSections.distance ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="px-2">
            <Slider
              value={[filters.radius]}
              onValueChange={handleRadiusChange}
              max={50}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 mi</span>
              <span>{filters.radius} miles</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Availability */}
      <Collapsible open={openSections.availability} onOpenChange={() => toggleSection("availability")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900">
          Availability{" "}
          {filters.availableNow && (
            <Badge variant="secondary" className="text-xs">
              Open Now
            </Badge>
          )}
          {openSections.availability ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox id="availableNow" checked={filters.availableNow} onCheckedChange={handleAvailabilityToggle} />
            <label htmlFor="availableNow" className="text-xs text-gray-700 cursor-pointer">
              Open Now
            </label>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
