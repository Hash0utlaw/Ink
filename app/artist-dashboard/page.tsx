import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getBookingsForArtist } from "@/lib/supabase/bookings"
import { getCurrentUserId, getUserProfile } from "@/lib/supabase/users"
import { getArtistHandleForUser } from "@/lib/supabase/artists"
import { ShareBookingLink } from "@/components/artist-dashboard/share-booking-link"
import { NoRequestsYet } from "@/components/artist-dashboard/no-requests-yet"
import { BookingStatus } from "@/components/dashboard/booking-status"

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
  const [bookings, profile, handle] = await Promise.all([
    userId ? getBookingsForArtist(userId) : Promise.resolve([]),
    userId ? getUserProfile(userId) : Promise.resolve(null),
    userId ? getArtistHandleForUser(userId) : Promise.resolve(null),
  ])

  const isPro = profile?.subscriptionTier === "pro"
  const pending = bookings.filter((b) => b.status === "pending")
  const confirmed = bookings.filter((b) => b.status === "confirmed")
  const recent = bookings.slice(0, 5)

  // Only stats with something to count; a zero is never shown.
  const stats = [
    { label: "Pending requests", value: pending.length, note: "awaiting your response" },
    { label: "Confirmed bookings", value: confirmed.length, note: null },
    { label: "Total requests", value: bookings.length, note: "all time" },
  ].filter((s) => s.value > 0)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-[30px] leading-tight text-balance md:text-[34px]">Dashboard</h1>
        {isPro && <Badge variant="outline">Pro</Badge>}
      </div>

      {bookings.length === 0 ? (
        <NoRequestsYet handle={handle} />
      ) : (
        <>
          {handle && (
            <Card>
              <CardContent className="p-6">
                <ShareBookingLink handle={handle} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6">
              <dl className="grid gap-6 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-sm font-semibold text-ink">{stat.label}</dt>
                    <dd className="font-heading text-[30px] leading-tight tabular-nums">{stat.value}</dd>
                    {stat.note && <dd className="text-[13px] text-ink-muted">{stat.note}</dd>}
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle>Recent booking requests</CardTitle>
              <Button asChild variant="outline">
                <Link href="/artist-dashboard/appointments">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul>
                {recent.map((booking) => (
                  <li
                    key={booking.id}
                    className="flex items-start justify-between gap-4 border-b border-rule py-3 first:pt-0 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{booking.clientName}</p>
                      <p className="text-sm text-ink-muted tabular-nums">{formatDate(booking.preferredDate)}</p>
                      {booking.description && (
                        <p className="mt-0.5 line-clamp-1 text-sm text-ink-muted">{booking.description}</p>
                      )}
                    </div>
                    <BookingStatus status={booking.status} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
