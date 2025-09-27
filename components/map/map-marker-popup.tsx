"use client"

import type { MapboxLocation } from "@/lib/mapbox"
import { Badge } from "@/components/ui/badge"
import { Star, MapPin, Clock } from "lucide-react"

interface MapMarkerPopupProps {
  location: MapboxLocation
}

export function MapMarkerPopup({ location }: MapMarkerPopupProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[280px] max-w-[320px]">
      <div className="flex items-start gap-3">
        <img
          src={location.image || "/placeholder.svg"}
          alt={location.name}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{location.name}</h3>
          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {location.address}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{location.rating}</span>
              <span className="text-xs text-gray-500">({location.reviewCount})</span>
            </div>

            <Badge variant={location.isOpen ? "default" : "secondary"} className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {location.isOpen ? "Open" : "Closed"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex flex-wrap gap-1">
          {location.specialties.slice(0, 3).map((specialty) => (
            <Badge key={specialty} variant="outline" className="text-xs">
              {specialty}
            </Badge>
          ))}
          {location.specialties.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{location.specialties.length - 3} more
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Price Range:</span>
          <span className="font-medium">{location.priceRange}</span>
        </div>
        {location.distance && (
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">Distance:</span>
            <span className="font-medium">{location.distance}</span>
          </div>
        )}
      </div>
    </div>
  )
}
