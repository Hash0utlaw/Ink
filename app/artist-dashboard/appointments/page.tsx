import { getBookingsForArtist } from "@/lib/supabase/bookings"
import { getCurrentUserId } from "@/lib/supabase/users"
import { AppointmentsView } from "@/components/artist-dashboard/appointments-view"
import { Badge } from "@/components/ui/badge"
import { StatusSwatch } from "@/components/dashboard/booking-status"

export default async function AppointmentsPage() {
  const userId = await getCurrentUserId()
  const bookings = userId ? await getBookingsForArtist(userId) : []

  const pendingCount = bookings.filter((b) => b.status === "pending").length

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-[30px] leading-tight text-balance md:text-[34px]">Appointments</h1>
        {pendingCount > 0 && (
          <Badge variant="outline" className="gap-1.5 text-sm tabular-nums">
            <StatusSwatch className="bg-warning" />
            {pendingCount} pending
          </Badge>
        )}
      </div>

      <AppointmentsView bookings={bookings} />
    </div>
  )
}
