import { Suspense } from "react"
import type { Metadata } from "next"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { MapInterface } from "@/components/map/map-interface"

export const metadata: Metadata = {
  title: "Tattoo Map | TattooMaps",
  description: "Explore tattoo artists and shops near you on an interactive map.",
}

// One screen tall, below the admin banner when it shows (it sets
// --admin-banner-h). The header keeps its height and the map fills the rest,
// so the page itself never scrolls. dvh tracks mobile browser chrome.
// /map?lat=&lng=&near= (the artist finder's "See on the map") starts there.
// Anything missing or out of range keeps the default whole-US view.
function startFrom(searchParams: Record<string, string | string[] | undefined>) {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const lat = Number(one(searchParams.lat))
  const lng = Number(one(searchParams.lng))
  const latText = one(searchParams.lat)
  const lngText = one(searchParams.lng)
  const valid =
    !!latText && !!lngText && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  if (!valid) return { center: null, place: null }
  const near = one(searchParams.near)?.trim().slice(0, 60)
  return { center: [lng, lat] as [number, number], place: near || null }
}

export default function MapPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const start = startFrom(searchParams)
  return (
    <div className="flex h-[calc(100dvh-var(--admin-banner-h,0px))] flex-col overflow-hidden">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <MapInterface initialCenter={start.center} initialPlace={start.place} />
    </div>
  )
}
