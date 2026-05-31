import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarDays, Clock, Crown, Users } from "lucide-react"
import Link from "next/link"
import { getBookingsForArtist } from "@/lib/supabase/bookings"
import { getCurrentUserId, getUserProfile } from "@/lib/supabase/users"
import type { BookingRequest } from "@/lib/supabase/bookings"

const STATUS_STYLES: Record<BookingRequest["status"], string> = {
  pending: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  confirmed: "bg-green-500/20 text-green-500 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-500 border-red-500/30",
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Date TBD"
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return dateStr
  }
}

export default async function ArtistDashboardPage() {
  const userId = await getCurrentUserId()
  const [bookings, profile] = await Promise.all([
    userId ? getBookingsForArtist(userId) : Promise.resolve([]),
    userId ? getUserProfile(userId) : Promise.resolve(null),
  ])

  const isPro = profile?.subscriptionTier === "pro"
  const pending = bookings.filter((b) => b.status === "pending")
  const confirmed = bookings.filter((b) => b.status === "confirmed")
  const recent = bookings.slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {isPro && (
          <Badge className="bg-accent text-accent-foreground flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5" />
            Pro
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending.length}</div>
            <p className="text-xs text-muted-foreground">awaiting your response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confirmed.length}</div>
            <p className="text-xs text-muted-foreground">upcoming appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
            <p className="text-xs text-muted-foreground">all time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Booking Requests</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/artist-dashboard/appointments">View All</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No booking requests yet. Share your profile to start receiving bookings.
            </p>
          ) : (
            recent.map((booking) => (
              <div key={booking.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{booking.clientName}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(booking.preferredDate)}</p>
                  {booking.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{booking.description}</p>
                  )}
                </div>
                <Badge className={`shrink-0 ${STATUS_STYLES[booking.status]}`}>{booking.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
