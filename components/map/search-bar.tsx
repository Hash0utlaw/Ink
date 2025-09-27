"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { geocodeAddress } from "@/lib/mapbox"
import { Search, MapPin, Loader2 } from "lucide-react"

interface SearchBarProps {
  onSearch: (query: string, coordinates?: [number, number]) => void
  onCurrentLocation: () => void
  placeholder?: string
}

export function SearchBar({ onSearch, onCurrentLocation, placeholder = "Search..." }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    try {
      const coordinates = await geocodeAddress(query)
      onSearch(query, coordinates || undefined)
    } catch (error) {
      console.error("Search error:", error)
      onSearch(query)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleSearch} className="relative">
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-4"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </form>

      <Button
        variant="outline"
        size="sm"
        onClick={onCurrentLocation}
        className="w-full justify-start text-sm bg-transparent"
      >
        <MapPin className="w-4 h-4 mr-2" />
        Use Current Location
      </Button>
    </div>
  )
}
