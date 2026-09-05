import { getBookingsForArtist } from "@/lib/supabase/bookings"
import { getCurrentUserId } from "@/lib/supabase/users"
import { AppointmentsView } from "@/components/artist-dashboard/appointments-view"

export default async function AppointmentsPage() {
  const userId = await getCurrentUserId()
  const bookings = userId ? await getBookingsForArtist(userId) : []

  const pendingCount = bookings.filter((b) => b.status === "pending").length

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Appointments</h1>
        {pendingCount > 0 && (
          <span className="rounded-full bg-blue-500/20 text-blue-500 border border-blue-500/30 px-3 py-1 text-sm font-medium">
            {pendingCount} pending
          </span>
        )}
      </div>

      <AppointmentsView bookings={bookings} />
    </div>
  )
}
