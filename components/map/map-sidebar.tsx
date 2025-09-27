"use client"

import type React from "react"

import { useState } from "react"
import { Search, MapPin, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MapFilters } from "./map-filters"
import type { MapboxLocation } from "@/lib/mapbox"

interface MapSidebarProps {
  isOpen: boolean
  onToggle: () => void
  locations: MapboxLocation[]
  selectedLocation: MapboxLocation | null
  onLocationSelect: (location: MapboxLocation) => void
  filters: any
  onFilterChange: (filters: any) => void
  onSearch: (query: string) => void
  onCurrentLocation: () => void
  loading: boolean
}

export function MapSidebar({
  isOpen,
  onToggle,
  locations,
  selectedLocation,
  onLocationSelect,
  filters,
  onFilterChange,
  onSearch,
  onCurrentLocation,
  loading,
}: MapSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchQuery)
  }

  const handleLocationClick = (location: MapboxLocation) => {
    onLocationSelect(location)
  }

  return (
    <>
      {/* Sidebar Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="absolute top-4 left-4 z-40 bg-white hover:bg-gray-50"
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </Button>

      {/* Sidebar */}
      <div
        className={`
        bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-30
        ${isOpen ? "w-80" : "w-0"}
        ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
      `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Find Locations</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search location, artist, or style..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCurrentLocation}
              className="w-full bg-transparent"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Use Current Location
            </Button>
          </form>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <MapFilters filters={filters} onFilterChange={onFilterChange} />
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {loading ? "Loading..." : `${locations.length} locations found`}
              </span>
              {filters.searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    onSearch("")
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear search
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : locations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <MapPin className="w-8 h-8 mx-auto" />
                  </div>
                  <p className="text-sm text-gray-600">No locations found</p>
                  <p className="text-xs text-gray-500 mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                locations.map((location) => (
                  <div
                    key={location.id}
                    onClick={() => handleLocationClick(location)}
                    className={`
                    cursor-pointer p-3 rounded-lg border transition-all duration-200
                    ${
                      selectedLocation?.id === location.id
                        ? "border-burgundy-500 bg-burgundy-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }
                  `}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={location.image || "/placeholder.svg"}
                        alt={location.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">{location.name}</h3>
                          <Badge variant={location.type === "artist" ? "default" : "secondary"} className="text-xs">
                            {location.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-3 h-3 ${
                                  i < Math.floor(location.rating) ? "text-yellow-400" : "text-gray-300"
                                }`}
                              >
                                ★
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-gray-600">
                            {location.rating} ({location.reviewCount})
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 truncate mb-1">{location.address}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {location.specialties.slice(0, 2).map((specialty) => (
                              <span key={specialty} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {specialty}
                              </span>
                            ))}
                            {location.specialties.length > 2 && (
                              <span className="text-xs text-gray-500">+{location.specialties.length - 2}</span>
                            )}
                          </div>
                          {location.distance && (
                            <span className="text-xs text-gray-500">
                              {location.distance < 1
                                ? `${(location.distance * 5280).toFixed(0)} ft`
                                : `${location.distance.toFixed(1)} mi`}
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <span className={`text-xs ${location.isOpen ? "text-green-600" : "text-red-600"}`}>
                            {location.isOpen ? "Open Now" : "Closed"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  )
}
