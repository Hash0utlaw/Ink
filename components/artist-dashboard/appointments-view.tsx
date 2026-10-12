"use client"

import { useMemo, useState } from "react"
import { isSameDay } from "date-fns"
import { X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { BookingCard } from "@/components/artist-dashboard/booking-card"
import type { BookingRequest } from "@/lib/supabase/bookings"

export function AppointmentsView({ bookings }: { bookings: BookingRequest[] }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  const pending = bookings.filter((b) => b.status === "pending")
  const active = bookings.filter((b) => b.status !== "cancelled" && b.status !== "declined")

  const bookedDates = useMemo(
    () =>
      bookings
        .filter((b) => b.preferredDate)
        .map((b) => new Date(b.preferredDate as string)),
    [bookings]
  )

  const filteredActive = selectedDate
    ? active.filter((b) => b.preferredDate && isSameDay(new Date(b.preferredDate), selectedDate))
    : active

  return (
    <div className="grid gap-8 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        {pending.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Needs your response</CardTitle>
            </CardHeader>
            <CardContent>
              {pending.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle>
              {selectedDate
                ? `Requests on ${selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
                : "All requests"}
            </CardTitle>
            {selectedDate && (
              <Button
                variant="ghost"
                className="min-h-11 shrink-0 gap-1.5 px-3 text-ink-muted"
                onClick={() => setSelectedDate(undefined)}
              >
                <X aria-hidden="true" />
                Clear filter
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {filteredActive.length === 0 ? (
              <p className="text-ink-muted">
                {selectedDate
                  ? "No requests for this date."
                  : "No booking requests yet. Share your booking link to start receiving briefs."}
              </p>
            ) : (
              filteredActive.map((booking) => <BookingCard key={booking.id} booking={booking} />)
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="w-fit">
          <CardContent className="p-2">
            <Calendar
              mode="single"
              className="p-0"
              selected={selectedDate}
              onSelect={(date) =>
                setSelectedDate((prev) => (date && prev && isSameDay(date, prev) ? undefined : date))
              }
              modifiers={{ booked: bookedDates }}
              modifiersClassNames={{
                booked:
                  "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:bg-ink after:content-['']",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
