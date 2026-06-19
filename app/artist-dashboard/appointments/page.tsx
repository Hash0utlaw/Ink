import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { getBookingsForArtist } from "@/lib/supabase/bookings"
import { getCurrentUserId } from "@/lib/supabase/users"
import { BookingCard } from "@/components/artist-dashboard/booking-card"

export default async function AppointmentsPage() {
  const userId = await getCurrentUserId()
  const bookings = userId ? await getBookingsForArtist(userId) : []

  const pending = bookings.filter((b) => b.status === "pending")
  const active = bookings.filter((b) => b.status !== "cancelled" && b.status !== "declined")

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Appointments</h1>
        {pending.length > 0 && (
          <span className="rounded-full bg-blue-500/20 text-blue-500 border border-blue-500/30 px-3 py-1 text-sm font-medium">
            {pending.length} pending
          </span>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          {pending.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Needs your response</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pending.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">All requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {active.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground text-sm">
                  No booking requests yet. Share your booking link to start receiving briefs.
                </p>
              ) : (
                active.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-2">
              <Calendar mode="single" className="p-0" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
