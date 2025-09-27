"use client"

import type React from "react"
import { useState } from "react"
import { Search, MapPin, Filter, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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
      {/* Sidebar Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="absolute top-4 left-4 z-40 bg-white hover:bg-gray-50 shadow-lg"
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </Button>

      {/* Sidebar */}
      <div
        className={`
        bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-30 shadow-lg
        ${isOpen ? "w-96" : "w-0"}
        ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
      `}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Find Locations</h2>
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
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search location, artist, or style..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            <Button type="button" variant="outline" onClick={onCurrentLocation} className="w-full h-12 bg-transparent">
              <MapPin className="w-4 h-4 mr-2" />
              Use Current Location
            </Button>
          </form>

          {/* Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <MapFilters filters={filters} onFilterChange={onFilterChange} />
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  `${locations.length} locations found`
                )}
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
            <div className="p-6 space-y-4">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : locations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <MapPin className="w-12 h-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No locations found</h3>
                  <p className="text-gray-500">Try adjusting your filters or search terms</p>
                </div>
              ) : (
                locations.map((location) => (
                  <Card
                    key={location.id}
                    onClick={() => handleLocationClick(location)}
                    className={`
                    cursor-pointer transition-all duration-200 hover:shadow-md
                    ${
                      selectedLocation?.id === location.id
                        ? "ring-2 ring-burgundy-500 bg-burgundy-50"
                        : "hover:bg-gray-50"
                    }
                  `}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={location.image || "/placeholder.svg?height=64&width=64&query=tattoo shop"}
                          alt={location.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 truncate">{location.name}</h3>
                            <Badge variant={location.type === "artist" ? "default" : "secondary"}>
                              {location.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < Math.floor(location.rating)
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium">{location.rating}</span>
                            <span className="text-sm text-gray-500">({location.reviewCount})</span>
                          </div>
                          <p className="text-sm text-gray-600 truncate mb-2">{location.address}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                              {location.specialties.slice(0, 2).map((specialty) => (
                                <Badge key={specialty} variant="outline" className="text-xs">
                                  {specialty}
                                </Badge>
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
                          <Separator className="my-2" />
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-medium ${location.isOpen ? "text-green-600" : "text-red-600"}`}
                            >
                              {location.isOpen ? "Open Now" : "Closed"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  )
}
