"use client"

// Last-resort error page for errors in the root layout itself. It replaces the
// layout, so it brings its own <html>, <body> and stylesheet. Reports to Sentry.
import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"
import "./globals.css"
import { Button } from "@/components/ui/button"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen bg-paper tex-paper font-sans antialiased">
        <main className="flex min-h-screen items-center justify-center">
          <div className="container mx-auto px-4 py-20 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight">Something went wrong</h1>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              An unexpected error occurred. Please try again, or head back to the TattooMaps home page.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={reset}>Try again</Button>
              <Button asChild variant="outline">
                {/* Plain link: the router may be what failed. */}
                <a href="/">Back to home</a>
              </Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
