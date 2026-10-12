"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X, Loader2 } from "lucide-react"
import type { BookingRequest } from "@/lib/supabase/bookings"
import { useRouter } from "next/navigation"
import { BookingStatus } from "@/components/dashboard/booking-status"

interface BookingCardProps {
  booking: BookingRequest
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Date TBD"
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  } catch {
    return dateStr
  }
}

/** One booking request as a list row; rows are divided by a rule inside their card. */
export function BookingCard({ booking }: BookingCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<"confirm" | "decline" | "complete" | null>(null)
  const [status, setStatus] = useState(booking.status)

  async function act(action: "confirm" | "decline" | "complete") {
    setLoading(action)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const { status: newStatus } = await res.json()
        setStatus(newStatus)
        router.refresh()
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-3 border-b border-rule py-4 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold">{booking.clientName}</p>
          <BookingStatus status={status} />
        </div>
        <p className="text-sm text-ink-muted tabular-nums">{formatDate(booking.preferredDate)}</p>
        {(booking.style || booking.size) && (
          <p className="text-sm text-ink-muted">
            {[booking.style, booking.size, booking.placement].filter(Boolean).join(", ")}
          </p>
        )}
        {booking.budget && <p className="text-sm text-ink-muted">Budget: {booking.budget}</p>}
        {booking.description && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{booking.description}</p>}
        <p className="break-all text-[13px] text-ink-muted">{booking.clientEmail}</p>
      </div>

      {status === "pending" && (
        <div className="flex shrink-0 gap-2 sm:flex-col">
          <Button variant="secondary" disabled={loading !== null} onClick={() => act("confirm")}>
            {loading === "confirm" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
            Confirm
          </Button>
          <Button variant="outline" disabled={loading !== null} onClick={() => act("decline")}>
            {loading === "decline" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <X aria-hidden="true" />}
            Decline
          </Button>
        </div>
      )}
      {status === "confirmed" && (
        <Button variant="secondary" className="shrink-0 self-start" disabled={loading !== null} onClick={() => act("complete")}>
          {loading === "complete" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
          Complete
        </Button>
      )}
    </div>
  )
}
