"use client"

import type React from "react"

import { useState } from "react"
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
          aria-label={placeholder}
          className="h-11 border-1.5 border-ink bg-white pl-10 pr-10 text-base"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ink-muted" />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ink-muted animate-spin" />
        )}
      </form>

      <button
        type="button"
        onClick={onCurrentLocation}
        className="inline-flex min-h-11 w-full items-center gap-2 rounded-lg border-1.5 border-ink bg-vellum tex-vellum px-3 text-[15px] font-semibold text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MapPin className="h-4 w-4" aria-hidden="true" />
        Use my location
      </button>
    </div>
  )
}
