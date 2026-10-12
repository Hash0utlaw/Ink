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
export default function MapPage() {
  return (
    <div className="flex h-[calc(100dvh-var(--admin-banner-h,0px))] flex-col overflow-hidden">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <MapInterface />
    </div>
  )
}
