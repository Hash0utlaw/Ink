import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Zap } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { getCurrentUserId, getUserProfile } from "@/lib/supabase/users"
import { getArtistFlashListings } from "@/lib/supabase/flash"
import { FlashUploadForm } from "@/components/artist-dashboard/flash-upload-form"
import { FlashManageCard } from "@/components/artist-dashboard/flash-manage-card"

const FLASH_LIMITS: Record<string, number | null> = {
  free: 3,
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
  const usageLabel = limit === null ? `${activeCount} listings (unlimited)` : `${activeCount}/${limit} listings used`

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-[#7C3AED]/20 p-2">
            <Zap className="w-5 h-5 text-[#7C3AED]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Flash Listings</h1>
            <p className="text-sm text-muted-foreground">{usageLabel}</p>
          </div>
        </div>
        {atLimit && (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
            Upgrade for unlimited
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Upload form */}
        <div className="lg:col-span-2">
          <Card className="bg-muted/30 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Flash Listing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {atLimit ? (
                <div className="py-6 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    You&apos;ve reached the {tier} tier limit of {limit} listings.
                  </p>
                  <Button className="bg-[#7C3AED] hover:bg-[#6D28D9]" asChild>
                    <a href="/pricing">Upgrade to Pro</a>
                  </Button>
                </div>
              ) : (
                <FlashUploadForm />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Existing listings */}
        <div className="lg:col-span-3 space-y-4">
          {listings.length === 0 ? (
            <Card className="bg-muted/20 border-dashed border-border">
              <CardContent className="py-16 text-center">
                <Zap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-semibold text-muted-foreground">No flash listings yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Add your first design to appear on the Flash discovery page.
                </p>
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
