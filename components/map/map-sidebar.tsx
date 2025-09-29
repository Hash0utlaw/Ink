"use client"

import type React from "react"
import { useState } from "react"
import { Search, MapPin, Filter, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MapFilters } from "./map-filters"
import type { MapboxLocation } from "@/lib/mapbox"
import { Star } from "lucide-react"

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
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="absolute top-6 left-6 z-40 sidebar-toggle rounded-full w-10 h-10 p-0 bg-transparent"
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </Button>

      <div
        className={`
        sidebar-modern flex flex-col transition-all duration-500 ease-out z-30 shadow-2xl
        ${isOpen ? "w-[420px]" : "w-0"}
        ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
      `}
      >
        <div className="sidebar-header p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Discover</h1>
              <p className="text-sm text-muted-foreground mt-1">Find your perfect tattoo artist</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`sidebar-button rounded-full w-10 h-10 p-0 ${showFilters ? "bg-accent/10 text-accent" : ""}`}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="sidebar-search p-4">
              <div className="flex items-center gap-3">
                <Search className="text-muted-foreground w-5 h-5 flex-shrink-0" />
                <Input
                  type="text"
                  placeholder="Search artists, shops, or styles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 bg-transparent p-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 text-base"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onCurrentLocation}
              className="sidebar-button w-full h-12 text-foreground font-medium bg-transparent"
            >
              <MapPin className="w-4 h-4 mr-3" />
              Use Current Location
            </Button>
          </form>

          {showFilters && (
            <div className="mt-8 sidebar-filter-section">
              <MapFilters filters={filters} onFilterChange={onFilterChange} />
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-8 py-4 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {loading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Loading...</span>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-foreground">{locations.length}</span>
                    <span className="text-sm text-muted-foreground">
                      {locations.length === 1 ? "location" : "locations"} found
                    </span>
                  </>
                )}
              </div>
              {filters.searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    onSearch("")
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground h-auto p-2"
                >
                  Clear search
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 scrollbar-ink">
            <div className="p-6 space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="sidebar-card p-6 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 bg-muted rounded-xl"></div>
                      <div className="flex-1 space-y-3">
                        <div className="h-5 bg-muted rounded-lg w-3/4"></div>
                        <div className="h-4 bg-muted rounded-lg w-1/2"></div>
                        <div className="h-4 bg-muted rounded-lg w-2/3"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : locations.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-muted-foreground mb-6">
                    <MapPin className="w-16 h-16 mx-auto opacity-40" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">No locations found</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Try adjusting your filters or search terms to discover more artists and shops
                  </p>
                </div>
              ) : (
                locations.map((location) => (
                  <div
                    key={location.id}
                    onClick={() => handleLocationClick(location)}
                    className={`
                    modern-location-card p-6 group
                    ${selectedLocation?.id === location.id ? "modern-location-card-selected" : ""}
                  `}
                  >
                    <div className="flex items-start gap-5">
                      <img
                        src={location.image || "/placeholder.svg?height=80&width=80&query=tattoo shop"}
                        alt={location.name}
                        className="w-20 h-20 location-card-image group-hover:scale-105"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground text-lg truncate mb-1">{location.name}</h3>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={location.type === "artist" ? "default" : "secondary"}
                                className="text-xs font-medium"
                              >
                                {location.type}
                              </Badge>
                              <span
                                className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  location.isOpen
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                }`}
                              >
                                {location.isOpen ? "Open" : "Closed"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < Math.floor(location.rating) ? "fill-yellow-400 text-yellow-400" : "text-border"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-foreground">{location.rating}</span>
                          <span className="text-sm text-muted-foreground">({location.reviewCount})</span>
                        </div>

                        <p className="text-sm text-muted-foreground mb-4 line-clamp-1">{location.address}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            {location.specialties.slice(0, 2).map((specialty) => (
                              <Badge key={specialty} variant="outline" className="text-xs filter-badge">
                                {specialty}
                              </Badge>
                            ))}
                            {location.specialties.length > 2 && (
                              <Badge variant="outline" className="text-xs filter-badge">
                                +{location.specialties.length - 2}
                              </Badge>
                            )}
                          </div>
                          {location.distance && (
                            <span className="text-xs text-muted-foreground font-medium">
                              {location.distance < 1
                                ? `${(location.distance * 5280).toFixed(0)} ft`
                                : `${location.distance.toFixed(1)} mi`}
                            </span>
                          )}
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
