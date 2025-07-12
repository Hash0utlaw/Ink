import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Download, Search, Heart } from "lucide-react"
import Link from "next/link"

interface ResultsGalleryProps {
  results: string[]
  isLoading: boolean
}

export function ResultsGallery({ results, isLoading }: ResultsGalleryProps) {
  const hasResults = results.length > 0

  return (
    <Card className="bg-muted/30 border-border/30 min-h-[60vh]">
      <CardContent className="p-4 md:p-6">
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && !hasResults && (
          <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8 text-accent"
              >
                <path d="M12 3c-1.1 0-2 .9-2 2v2.5a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5V5c0-1.1-.9-2-2-2z" />
                <path d="M14.5 7.5a2.5 2.5 0 0 1 0 5" />
                <path d="M9.5 7.5a2.5 2.5 0 0 0 0 5" />
                <path d="M12 12.5a2.5 2.5 0 0 1 2.5 2.5" />
                <path d="M12 12.5a2.5 2.5 0 0 0-2.5 2.5" />
                <path d="M12 15a2.5 2.5 0 0 1 0 5" />
                <path d="M12 20v1" />
                <path d="m15 3.5 1-1" />
                <path d="m9 3.5-1-1" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold">Your designs will appear here</h3>
            <p className="text-muted-foreground mt-2">Fill out the form and click "Generate" to see the magic.</p>
          </div>
        )}

        {!isLoading && hasResults && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {results.map((src, i) => (
              <div key={i} className="group relative overflow-hidden rounded-lg aspect-square">
                <img
                  src={src || "/placeholder.svg"}
                  alt={`Generated tattoo design ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 gap-2">
                  <Button size="sm" asChild>
                    <Link href="/artists?design=...">
                      <Search className="mr-2 h-4 w-4" /> Find Artist
                    </Link>
                  </Button>
                  <div className="flex gap-2">
                    <Button size="icon" variant="secondary">
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="secondary">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
