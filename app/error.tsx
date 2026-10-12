"use client"

import { useEffect } from "react"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper tex-paper">
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded bg-primary">
          <MapPin className="h-7 w-7 text-accent-foreground" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">Something went wrong</h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          An unexpected error occurred. Please try again, or head back to the TattooMaps home page.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
