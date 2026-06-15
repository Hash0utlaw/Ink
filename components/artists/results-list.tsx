"use client"

import { ArtistCard, ArtistCardSkeleton } from "./artist-card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Artist } from "@/types/artist"

interface ResultsListProps {
  artists: Artist[]
  isLoading: boolean
  distancesById?: Record<string, number>
  page: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function ResultsList({
  artists,
  isLoading,
  distancesById,
  page,
  totalCount,
  pageSize,
  onPageChange,
}: ResultsListProps) {
  const totalPages = Math.ceil(totalCount / pageSize)
  const firstItem = page * pageSize + 1
  const lastItem = Math.min((page + 1) * pageSize, totalCount)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ArtistCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (artists.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold">No Artists Found</h3>
        <p className="text-muted-foreground mt-2">Try adjusting your filters to find more results.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Showing {firstItem}–{lastItem} of {totalCount.toLocaleString()} artists
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {artists.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} distance={distancesById?.[artist.id]} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { onPageChange(page - 1); window.scrollTo({ top: 0, behavior: "smooth" }) }}
            disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground px-2">
            Page {page + 1} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => { onPageChange(page + 1); window.scrollTo({ top: 0, behavior: "smooth" }) }}
            disabled={page >= totalPages - 1}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
