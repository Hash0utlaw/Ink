import { Card } from "@/components/ui/card"
import type { Artist } from "@/types/artist"
import { MapPin } from "lucide-react"

export function MapView({ artists }: { artists: Artist[] }) {
  return (
    <Card className="relative h-64 md:h-80 w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: "url('/map-placeholder.png')" }}
      />
      <div className="absolute inset-0">
        {/* In a real app, you'd use a library like react-leaflet or @vis.gl/react-google-maps to render real markers */}
        {artists.map((artist) => (
          <div
            key={artist.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              // These are random positions for demonstration
              top: `${20 + (artist.location.lat % 1) * 60}%`,
              left: `${20 + (artist.location.lng % 1) * 60}%`,
            }}
          >
            <div className="group relative">
              <MapPin className="w-8 h-8 text-accent drop-shadow-lg cursor-pointer transition-transform group-hover:scale-125" />
              <div className="absolute bottom-full mb-2 w-max bg-background p-2 rounded-md text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {artist.name}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
