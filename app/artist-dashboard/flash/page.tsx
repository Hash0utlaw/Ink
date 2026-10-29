import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"
import { getCurrentUserId, getUserProfile } from "@/lib/supabase/users"
import { getArtistFlashListings } from "@/lib/supabase/flash"
import { FlashUploadForm } from "@/components/artist-dashboard/flash-upload-form"
import { FlashManageCard } from "@/components/artist-dashboard/flash-manage-card"

// No billing yet: the free limit is set high enough that no artist reaches it.
// Keep in sync with app/api/flash/route.ts.
const FLASH_LIMITS: Record<string, number | null> = {
  free: 30,
  pro: 30,
  shop: null, // unlimited
}

async function getArtistIdForUser(userId: string): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("artists")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()
    return (data as { id: string } | null)?.id ?? null
  } catch {
    return null
  }
}

export default async function ArtistFlashPage() {
  const userId = await getCurrentUserId()
  const artistId = userId ? await getArtistIdForUser(userId) : null
  const listings = artistId ? await getArtistFlashListings(artistId) : []
  const profile = userId ? await getUserProfile(userId) : null

  const tier = profile?.subscriptionTier ?? "free"
  const limit = FLASH_LIMITS[tier] ?? FLASH_LIMITS.free
  const activeCount = listings.filter((l) => l.isAvailable).length
  const atLimit = limit !== null && activeCount >= limit
  const usageLabel = limit === null ? `${activeCount} listings` : `${activeCount} of ${limit} listings in use`
  // The limit is enforced by POST /api/flash.

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-[30px] leading-tight text-balance md:text-[34px]">Flash listings</h1>
        <p className="mt-1 text-ink-muted tabular-nums">{usageLabel}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Upload form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Add a flash listing</CardTitle>
            </CardHeader>
            <CardContent>
              {atLimit ? (
                <div className="space-y-1">
                  <p className="font-semibold text-ink">All {limit} listings are in use.</p>
                  <p className="text-ink-muted">Hide or delete a listing to add another.</p>
                </div>
              ) : (
                <FlashUploadForm />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Existing listings */}
        <div className="space-y-4 lg:col-span-3">
          {listings.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="font-semibold text-ink">No flash listings yet.</p>
                <p className="text-ink-muted">Add your first design to appear on the Flash discovery page.</p>
              </CardContent>
            </Card>
          ) : (
            listings.map((listing) => (
              <FlashManageCard key={listing.id} listing={listing} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
