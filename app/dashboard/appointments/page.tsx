import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BookingStatus } from "@/components/dashboard/booking-status"
import { getCurrentUserId, getUserProfile } from "@/lib/supabase/users"
import { getBookingsForClient } from "@/lib/supabase/bookings"
import { getArtistsByIds } from "@/lib/supabase/artists"
import { initials } from "@/lib/initials"

export default async function AppointmentsPage() {
  const userId = await getCurrentUserId()
  const profile = userId ? await getUserProfile(userId) : null
  const bookings = profile?.email ? await getBookingsForClient(profile.email) : []
  const artists = await getArtistsByIds(bookings.map((b) => b.artistId))
  const artistById = new Map(artists.map((a) => [a.id, a]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[30px] leading-tight text-balance md:text-[34px]">Appointments</h1>
        <p className="mt-1 text-ink-muted">Your history of past and upcoming tattoo sessions.</p>
      </div>
      <Card>
        <CardContent className="p-6">
          {bookings.length === 0 ? (
            <div className="space-y-4">
              <p className="font-semibold text-ink">No appointments yet.</p>
              <Button asChild variant="outline">
                <Link href="/artists">Find an artist</Link>
              </Button>
            </div>
          ) : (
            <ul>
              {bookings.map((booking) => {
                const artist = artistById.get(booking.artistId)
                return (
                  <li
                    key={booking.id}
                    className="flex items-start gap-4 border-b border-rule py-4 first:pt-0 last:border-0 last:pb-0"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={artist?.avatarUrl || undefined} alt="" />
                      <AvatarFallback className="bg-vellum text-ink font-heading border-1.5 border-ink">{initials(artist?.name ?? "") || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-semibold">
                        {booking.preferredDate
                          ? new Date(booking.preferredDate).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "Date to be confirmed"}
                      </p>
                      <p className="text-sm text-ink-muted">
                        with {artist?.name ?? "an artist"}
                        {artist?.shopName ? ` at ${artist.shopName}` : ""}
                      </p>
                      <BookingStatus status={booking.status} className="sm:hidden" />
                    </div>
                    <BookingStatus status={booking.status} className="hidden sm:inline-flex" />
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
