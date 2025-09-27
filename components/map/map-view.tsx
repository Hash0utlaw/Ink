"use client"

import { MapPin, Users, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface MapViewProps {
  locations: any[]
  selectedLocation: any
  onLocationSelect: (location: any) => void
}

export function MapView({ locations, selectedLocation, onLocationSelect }: MapViewProps) {
  return (
    <div className="relative w-full h-full bg-gray-100">
      {/* Map Background - This would be replaced with actual map component */}
      <div
        className="w-full h-full bg-cover bg-center"
        style={{
          backgroundImage: "url('/map-placeholder.png')",
        }}
      >
        {/* Map Overlay */}
        <div className="absolute inset-0 bg-blue-50/20">
          {/* Location Markers */}
          {locations.map((location, index) => (
            <div
              key={location.id}
              className={`absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 hover:scale-110 ${
                selectedLocation?.id === location.id ? "scale-125 z-20" : "z-10"
              }`}
              style={{
                left: `${20 + (index % 8) * 10}%`,
                top: `${20 + Math.floor(index / 8) * 15}%`,
              }}
              onClick={() => onLocationSelect(location)}
            >
              {/* Marker */}
              <div
                className={`relative ${
                  selectedLocation?.id === location.id
                    ? "text-accent"
                    : location.type === "artist"
                      ? "text-blue-600"
                      : "text-purple-600"
                }`}
              >
                {location.type === "artist" ? (
                  <MapPin className="w-8 h-8 drop-shadow-lg" />
                ) : (
                  <div className="relative">
                    <MapPin className="w-8 h-8 drop-shadow-lg" />
                    <Users className="w-4 h-4 absolute top-1 left-1/2 transform -translate-x-1/2 text-white" />
                  </div>
                )}
              </div>

              {/* Tooltip on Hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="bg-white rounded-lg shadow-lg p-3 min-w-[200px] border">
                  <div className="flex items-start gap-3">
                    <img
                      src={location.image || "/placeholder.svg"}
                      alt={location.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-gray-900">{location.name}</h3>
                      <p className="text-xs text-gray-600 mb-1">{location.location}</p>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-gray-600">{location.rating}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {location.specialties?.slice(0, 2).map((specialty: string) => (
                          <Badge key={specialty} variant="secondary" className="text-xs px-1 py-0">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Attribution */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded">
        © TattooMaps 2024
      </div>
    </div>
  )
}
