import { Card, CardContent } from "@/components/ui/card"
import { ShareBookingLink } from "@/components/artist-dashboard/share-booking-link"

/** Shown in place of stats until the artist has a first booking request. */
export function NoRequestsYet({ handle }: { handle: string | null }) {
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div>
          <p className="font-semibold text-ink">No requests yet.</p>
          <p className="text-ink-muted">Share your booking link so clients can reach you.</p>
        </div>
        {handle && <ShareBookingLink handle={handle} />}
      </CardContent>
    </Card>
  )
}
