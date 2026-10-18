import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AvailabilitySettings } from "@/components/artist-dashboard/availability-settings"
import { createClient } from "@/utils/supabase/server"
import { getCurrentUserId } from "@/lib/supabase/users"
import type { AvailabilityStatus, PriceTier } from "@/types/artist"
import { ImageUploader } from "@/components/artist-dashboard/image-uploader"
import { WorkplaceSettings } from "@/components/artist-dashboard/workplace-settings"
import { allowedImageSrc } from "@/lib/utils/safe-image"

async function getArtistProfile(userId: string) {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("artists")
      // "*" rather than a column list: cover_image_url and is_private_studio only exist once their migrations run.
      .select("*, shops(name)")
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
      avatar_url: string | null
      cover_image_url?: string | null
      is_private_studio?: boolean | null
      shops?: { name: string | null } | null
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
      <h1 className="font-heading text-[30px] leading-tight text-balance md:text-[34px]">Edit profile</h1>

      {artist && (
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
            <CardDescription>
              Your profile photo and cover image appear at the top of your public profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <ImageUploader kind="avatar" artistId={artist.id} initialUrl={allowedImageSrc(artist.avatar_url)} />
            <ImageUploader kind="cover" artistId={artist.id} initialUrl={allowedImageSrc(artist.cover_image_url)} />
          </CardContent>
        </Card>
      )}

      {artist && (
        <Card>
          <CardHeader>
            <CardTitle>Where you work</CardTitle>
            <CardDescription>A listed shop, or a private studio. Only your city is shown, never an address.</CardDescription>
          </CardHeader>
          <CardContent>
            <WorkplaceSettings currentShopName={artist.shops?.name ?? null} isPrivateStudio={artist.is_private_studio === true} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Availability</CardTitle>
        </CardHeader>
        <CardContent>
          {artist ? (
            <AvailabilitySettings initialAvailability={artist.availability_status ?? "available"} />
          ) : (
            <p className="text-ink-muted">
              No artist profile found. Contact support if this is unexpected.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
