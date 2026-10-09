"use client"

import { ArtistPlateGrid, ArtistPlateSkeleton } from "./artist-plate-card"
import { ArtistList } from "./artist-list"
import { EmptyBox } from "@/components/artist-profile/profile-sections"
import { Pagination } from "@/components/listings/pagination"
import type { Artist } from "@/types/artist"

interface ResultsListProps {
  artists: Artist[]
  isLoading: boolean
  distancesById?: Record<string, number>
  page: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
  /** Replaces the default empty-state line, e.g. for a location search. */
  emptyMessage?: string
}

export function ResultsList({
  artists,
  isLoading,
  distancesById,
  page,
  totalCount,
  pageSize,
  onPageChange,
  emptyMessage,
}: ResultsListProps) {
  if (isLoading) {
    return (
      <ArtistPlateGrid>
        {Array.from({ length: 8 }).map((_, i) => (
          <ArtistPlateSkeleton key={i} />
        ))}
      </ArtistPlateGrid>
    )
  }

  if (artists.length === 0) {
    return (
      <EmptyBox title="No artists found.">
        {emptyMessage ?? "Try a nearby city, a different style or fewer filters."}
      </EmptyBox>
    )
  }

  return (
    <div>
      <ArtistList artists={artists} showShop distancesById={distancesById} />
      <Pagination page={page} totalPages={Math.ceil(totalCount / pageSize)} onPageChange={onPageChange} />
    </div>
  )
}
