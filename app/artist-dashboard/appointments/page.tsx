import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { getBookingsForArtist } from "@/lib/supabase/bookings"
import { getCurrentUserId } from "@/lib/supabase/users"
import type { BookingRequest } from "@/lib/supabase/bookings"

const STATUS_STYLES: Record<BookingRequest["status"], string> = {
  pending: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  confirmed: "bg-green-500/20 text-green-500 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-500 border-red-500/30",
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Date TBD"
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  } catch {
    return dateStr
  }
}

export default async function AppointmentsPage() {
  const userId = await getCurrentUserId()
  const bookings = userId ? await getBookingsForArtist(userId) : []
  const upcoming = bookings.filter((b) => b.status !== "cancelled")

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Appointments</h1>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Booking Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcoming.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No booking requests yet.</p>
              ) : (
                upcoming.map((booking) => (
                  <div key={booking.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{booking.clientName}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(booking.preferredDate)}</p>
                      {booking.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{booking.description}</p>
                      )}
                      {(booking.size || booking.placement) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[booking.size, booking.placement].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <Badge className={STATUS_STYLES[booking.status]}>{booking.status}</Badge>
                  </div>
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
