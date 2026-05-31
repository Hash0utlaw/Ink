"use client"

import { useState } from "react"
import { InfoSidebar, type BookingFormData } from "@/components/artist-profile/info-sidebar"
import type { Artist } from "@/types/artist"

interface BookingSectionProps {
  artist: Artist
}

export function BookingSection({ artist }: BookingSectionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  async function handleBookingSubmit(data: BookingFormData) {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          clientName: data.name,
          clientEmail: data.email,
          clientPhone: data.phone,
          preferredDate: data.date,
          description: data.description,
          size: data.size,
          placement: data.placement,
        }),
      })
      if (res.ok) {
        setSubmitSuccess(true)
      }
    } catch {
      // silent — InfoSidebar has no error state prop; leave form enabled
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <InfoSidebar
      artist={artist}
      onBookingSubmit={handleBookingSubmit}
      isSubmitting={isSubmitting}
      submitSuccess={submitSuccess}
    />
  )
}
