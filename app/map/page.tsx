import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { MapInterface } from "@/components/map/map-interface"

export default function MapPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1">
        <MapInterface />
      </main>

      <Footer />
    </div>
  )
}
