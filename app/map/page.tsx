import type { Metadata } from "next"
import { MapInterface } from "@/components/map/map-interface"

export const metadata: Metadata = {
  title: "Tattoo Map | TattooMaps",
  description: "Explore tattoo artists and shops near you on an interactive map.",
}

export default function MapPage() {
  return <MapInterface />
}
