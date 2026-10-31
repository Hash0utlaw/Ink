import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { getCurrentUserId } from "@/lib/supabase/users"
import { ImageUploader } from "@/components/artist-dashboard/image-uploader"
import { WorkplaceSettings } from "@/components/artist-dashboard/workplace-settings"
import { ProfileDetailsForm, type ProfileDetailsInitial } from "@/components/artist-dashboard/profile-details-form"
import { isAcceptingClients } from "@/lib/profile-details"
import { sortStyleSlugs } from "@/lib/styles"
import { cleanHandle } from "@/lib/socials"
import { allowedImageSrc } from "@/lib/utils/safe-image"
import { cn } from "@/lib/utils"

// Round 12: Profile details, Photo and cover, Where you work. The old
// Availability tab is folded into "Are you taking new clients?" in Profile details.
const TABS = [
  { value: "details", label: "Profile details" },
  { value: "photos", label: "Photo and cover" },
  { value: "workplace", label: "Where you work" },
] as const
type Tab = (typeof TABS)[number]["value"]

const SECTION = "flex flex-col gap-[18px] rounded border-1.5 border-ink bg-vellum tex-vellum p-5 sm:p-6"

type ArtistRow = {
  id: string
  display_name: string
  bio: string | null
  styles: string[] | null
  instagram_handle: string | null
  tiktok_handle: string | null
  website_url: string | null
  booking_url: string | null
  // The Round 12 columns only exist once 20261030120000_profile_details.sql runs.
  accepting_clients?: string | null
  shop_minimum?: number | null
  hourly_rate_min?: number | null
  hourly_rate_max?: number | null
  pricing_notes?: string | null
  avatar_url: string | null
  cover_image_url?: string | null
  is_private_studio?: boolean | null
  shops?: { name: string | null } | null
}

async function getArtistProfile(userId: string): Promise<ArtistRow | null> {
  try {
    const { data } = await createClient()
      .from("artists")
      // "*" rather than a column list: newer columns only exist once their migrations run.
      .select("*, shops(name)")
      .eq("user_id", userId)
      .maybeSingle()
    return data as ArtistRow | null
  } catch {
    return null
  }
}

function detailsFrom(a: ArtistRow): ProfileDetailsInitial {
  return {
    display_name: a.display_name ?? "",
    bio: a.bio ?? "",
    styles: sortStyleSlugs(a.styles ?? []),
    instagram_handle: cleanHandle("instagram", a.instagram_handle) ?? "",
    tiktok_handle: cleanHandle("tiktok", a.tiktok_handle) ?? "",
    website: a.website_url ?? "",
    booking_url: a.booking_url ?? "",
    accepting_clients: isAcceptingClients(a.accepting_clients) ? a.accepting_clients : "yes",
    shop_minimum: a.shop_minimum ?? null,
    hourly_rate_min: a.hourly_rate_min ?? null,
    hourly_rate_max: a.hourly_rate_max ?? null,
    pricing_notes: a.pricing_notes ?? "",
  }
}

export default async function EditProfilePage({ searchParams }: { searchParams: { tab?: string } }) {
  const userId = await getCurrentUserId()
  const artist = userId ? await getArtistProfile(userId) : null
  const tab: Tab = TABS.some((t) => t.value === searchParams.tab) ? (searchParams.tab as Tab) : "details"

  return (
    <div className="flex max-w-[820px] flex-col gap-[22px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-heading text-[30px] leading-tight text-balance md:text-[40px]">Your profile</h1>
        {artist && (
          <Link
            href={`/artists/${artist.id}`}
            className="text-[15px] font-semibold text-navy underline underline-offset-2 hover:no-underline max-md:hidden"
          >
            See your public page
          </Link>
        )}
      </div>

      {!artist ? (
        <div className="rounded border-1.5 border-ink bg-vellum tex-vellum p-5">
          <p className="font-semibold text-ink">No artist profile found</p>
          <p className="mt-1 text-[15px] text-ink-muted">Contact support if this is unexpected.</p>
        </div>
      ) : (
        <>
          <nav aria-label="Profile sections" className="-mx-1 flex gap-6 overflow-x-auto border-b border-rule px-1">
            {TABS.map((t) => (
              <Link
                key={t.value}
                href={t.value === "details" ? "/artist-dashboard/profile" : `/artist-dashboard/profile?tab=${t.value}`}
                aria-current={tab === t.value ? "page" : undefined}
                scroll={false}
                className={cn(
                  "-mb-px flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-[3px] px-0.5 text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  tab === t.value ? "border-ink text-ink" : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>

          {tab === "details" && <ProfileDetailsForm initial={detailsFrom(artist)} />}

          {tab === "photos" && (
            <section className={SECTION} aria-labelledby="photos-heading">
              <div className="flex flex-col gap-1">
                <h2 id="photos-heading" className="font-heading text-[22px] leading-[1.15] text-ink">
                  Photo and cover
                </h2>
                <p className="text-sm text-ink-muted">Your profile photo and cover image appear at the top of your public page.</p>
              </div>
              <ImageUploader kind="avatar" artistId={artist.id} initialUrl={allowedImageSrc(artist.avatar_url)} />
              <ImageUploader kind="cover" artistId={artist.id} initialUrl={allowedImageSrc(artist.cover_image_url)} />
            </section>
          )}

          {tab === "workplace" && (
            <section className={SECTION} aria-labelledby="workplace-heading">
              <div className="flex flex-col gap-1">
                <h2 id="workplace-heading" className="font-heading text-[22px] leading-[1.15] text-ink">
                  Where you work
                </h2>
                <p className="text-sm text-ink-muted">A listed shop, or a private studio. Only your city is shown, never an address.</p>
              </div>
              <WorkplaceSettings currentShopName={artist.shops?.name ?? null} isPrivateStudio={artist.is_private_studio === true} />
            </section>
          )}
        </>
      )}
    </div>
  )
}
