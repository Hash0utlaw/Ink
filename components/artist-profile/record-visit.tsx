"use client"

import { useEffect } from "react"
import { recordArtistVisit } from "@/components/utils/recently-viewed"

interface RecordVisitProps {
  id: string
  name: string
  handle: string
  avatarUrl: string
  city: string
}

export function RecordVisit({ id, name, handle, avatarUrl, city }: RecordVisitProps) {
  useEffect(() => {
    recordArtistVisit({ id, name, handle, avatarUrl, city })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return null
}
