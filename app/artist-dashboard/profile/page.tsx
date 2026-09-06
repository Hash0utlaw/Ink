import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AvailabilitySettings } from "@/components/artist-dashboard/availability-settings"
import { createClient } from "@/utils/supabase/server"
import { getCurrentUserId } from "@/lib/supabase/users"
import type { AvailabilityStatus, PriceTier } from "@/types/artist"

async function getArtistProfile(userId: string) {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("artists")
      .select("id, display_name, bio, availability_status, price_tier, avg_response_hours, first_booking_discount")
      .eq("user_id", userId)
      .maybeSingle()
    return data as {
      id: string
      display_name: string
      bio: string | null
      availability_status: AvailabilityStatus
      price_tier: PriceTier
      avg_response_hours: number | null
      first_booking_discount: number | null
    } | null
  } catch {
    return null
  }
}

export default async function EditProfilePage() {
  const userId = await getCurrentUserId()
  const artist = userId ? await getArtistProfile(userId) : null

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Edit Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Availability & Pricing</CardTitle>
          <CardDescription>
            These signals appear on your artist card and help clients find the right time and budget.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {artist ? (
            <AvailabilitySettings
              initialAvailability={artist.availability_status ?? "available"}
              initialPriceTier={artist.price_tier ?? "mid"}
              initialResponseHours={artist.avg_response_hours}
              initialDiscount={artist.first_booking_discount}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No artist profile found. Contact support if this is unexpected.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
