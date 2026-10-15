import type { Metadata } from "next"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { getCurrentUserId } from "@/lib/supabase/users"
import { EmptyBox } from "@/components/artist-profile/profile-sections"
import { PortfolioManager, type ManagedPhoto } from "@/components/artist-dashboard/portfolio-manager"
import { PORTFOLIO_PUBLIC_PREFIX } from "@/lib/utils/safe-image"

export const metadata: Metadata = { title: "Your portfolio | TattooMaps", robots: { index: false } }
export const dynamic = "force-dynamic"

/** The signed-in artist's claimed profile and its active photos, in order. */
async function getOwnPortfolio(userId: string) {
  const supabase = createClient()
  const { data: artist } = await supabase
    .from("artists")
    .select("id, display_name")
    .eq("user_id", userId)
    .eq("is_claimed", true)
    .maybeSingle()
  if (!artist) return null
  const { data } = await supabase
    .from("portfolio_images")
    .select("id, image_url, caption, style")
    .eq("artist_id", artist.id)
    .eq("is_active", true)
    .like("image_url", `${PORTFOLIO_PUBLIC_PREFIX}%`)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
  const photos: ManagedPhoto[] = (data ?? []).map(
    (r: { id: string; image_url: string; caption: string | null; style: string | null }) => ({
      id: r.id,
      url: r.image_url,
      caption: r.caption ?? "",
      style: r.style ?? "",
    }),
  )
  return { artistId: String(artist.id), name: String(artist.display_name ?? ""), photos }
}

export default async function ArtistPortfolioPage() {
  const userId = await getCurrentUserId()
  const own = userId ? await getOwnPortfolio(userId) : null

  if (!userId || !own) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-[32px] leading-tight md:text-[40px]">Your portfolio</h1>
        <EmptyBox title="Claim your page first">
          Your portfolio opens once your artist page is claimed and approved.{" "}
          <Link href="/claim" className="font-semibold text-navy underline underline-offset-2 hover:no-underline">
            Claim your page
          </Link>
        </EmptyBox>
      </div>
    )
  }

  return (
    <PortfolioManager
      userId={userId}
      artistName={own.name}
      publicHref={`/artists/${own.artistId}`}
      initialPhotos={own.photos}
    />
  )
}
