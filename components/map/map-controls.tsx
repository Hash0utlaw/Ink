"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface MapControlsProps {
  mapStyle: string
  onMapStyleChange: (style: string) => void
}

const mapStyles = [
  { id: "streets", name: "Streets", icon: "🗺️" },
  { id: "satellite", name: "Satellite", icon: "🛰️" },
  { id: "light", name: "Light", icon: "☀️" },
  { id: "dark", name: "Dark", icon: "🌙" },
]

export function MapControls({ mapStyle, onMapStyleChange }: MapControlsProps) {
  return (
    <div>
      <Label className="text-sm font-medium mb-2 block">Map Style</Label>
      <div className="grid grid-cols-2 gap-2">
        {mapStyles.map((style) => (
          <Button
            key={style.id}
            variant={mapStyle === style.id ? "default" : "outline"}
            size="sm"
            onClick={() => onMapStyleChange(style.id)}
            className="justify-start text-xs"
          >
            <span className="mr-2">{style.icon}</span>
            {style.name}
          </Button>
        ))}
      </div>
    </div>
  )
}
