import { Suspense } from "react"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex flex-1 items-center justify-center bg-background">
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <MapPin className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Page not found</h1>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            We couldn&apos;t find the page you were looking for. It may have moved or no longer exists.
          </p>
          <Button asChild className="mt-8">
            <Link href="/">Back to TattooMaps</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  )
}
