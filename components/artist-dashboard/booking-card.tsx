"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, X, Loader2 } from "lucide-react"
import type { BookingRequest } from "@/lib/supabase/bookings"
import { useRouter } from "next/navigation"

interface BookingCardProps {
  booking: BookingRequest
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  confirmed: "bg-green-500/20 text-green-500 border-green-500/30",
  declined: "bg-red-500/20 text-red-500 border-red-500/30",
  cancelled: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  completed: "bg-purple-500/20 text-purple-400 border-purple-500/30",
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Date TBD"
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  } catch {
    return dateStr
  }
}

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
    <div className="flex items-start gap-4 p-4 border rounded-lg">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{booking.clientName}</p>
          <Badge className={`shrink-0 text-xs ${STATUS_STYLES[status] ?? STATUS_STYLES.pending}`}>{status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{formatDate(booking.preferredDate)}</p>
        {(booking.style || booking.size) && (
          <p className="text-xs text-muted-foreground">
            {[booking.style, booking.size, booking.placement].filter(Boolean).join(" · ")}
          </p>
        )}
        {booking.budget && (
          <p className="text-xs text-muted-foreground">Budget: {booking.budget}</p>
        )}
        {booking.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{booking.description}</p>
        )}
        <p className="text-xs text-muted-foreground/60">{booking.clientEmail}</p>
      </div>

      {status === "pending" && (
        <div className="flex flex-col gap-2 shrink-0">
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5" disabled={loading !== null} onClick={() => act("confirm")}>
            {loading === "confirm" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Confirm
          </Button>
          <Button size="sm" variant="outline" className="border-red-500/40 text-red-500 hover:bg-red-500/10 gap-1.5" disabled={loading !== null} onClick={() => act("decline")}>
            {loading === "decline" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
            Decline
          </Button>
        </div>
      )}
      {status === "confirmed" && (
        <Button size="sm" className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white gap-1.5" disabled={loading !== null} onClick={() => act("complete")}>
          {loading === "complete" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Complete
        </Button>
      )}
    </div>
  )
}
