import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getCurrentUserId, getUserProfile } from "@/lib/supabase/users"
import { getBookingsForClient } from "@/lib/supabase/bookings"
import { getArtistsByIds } from "@/lib/supabase/artists"

export default async function AppointmentsPage() {
  const userId = await getCurrentUserId()
  const profile = userId ? await getUserProfile(userId) : null
  const bookings = profile?.email ? await getBookingsForClient(profile.email) : []
  const artists = await getArtistsByIds(bookings.map((b) => b.artistId))
  const artistById = new Map(artists.map((a) => [a.id, a]))

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Appointments</CardTitle>
        <CardDescription>Your history of past and upcoming tattoo sessions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No appointments yet.</p>
        ) : (
          bookings.map((booking) => {
            const artist = artistById.get(booking.artistId)
            return (
              <div key={booking.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={artist?.avatarUrl || "/placeholder.svg"} />
                  <AvatarFallback>{(artist?.name ?? "?").charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
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
                  <p className="text-sm text-muted-foreground">
                    with {artist?.name ?? "an artist"}
                    {artist?.shopName ? ` at ${artist.shopName}` : ""}
                  </p>
                </div>
                <Badge
                  className={cn({
                    "bg-blue-500/20 text-blue-500 border-blue-500/30":
                      booking.status === "pending" || booking.status === "confirmed",
                    "bg-green-500/20 text-green-500 border-green-500/30": booking.status === "completed",
                    "bg-red-500/20 text-red-500 border-red-500/30":
                      booking.status === "declined" || booking.status === "cancelled",
                  })}
                >
                  {booking.status}
                </Badge>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
