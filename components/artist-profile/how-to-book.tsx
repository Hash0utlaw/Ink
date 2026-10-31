import Link from "next/link"
import type { Artist } from "@/types/artist"
import { NeatlineFrame } from "@/components/brand/neatline-frame"
import { PrivateStudioLabel, firstName } from "@/components/brand/private-studio"
import { SocialIcon } from "@/components/brand/social-icon"
import { followersLabel } from "@/lib/format-count"
import { cleanHandle, profileUrl } from "@/lib/socials"
import { STATE_ABBR_TO_NAME } from "@/lib/utils/states"
import { RequestIntroButton } from "./request-intro-button"

const TEXT_LINK = "font-semibold text-navy underline underline-offset-2 hover:no-underline"

/**
 * Round 11 "How to book": the header panel for an artist with no shop, in place
 * of "Where to find". No address and no map, ever: their Instagram, the
 * request button and (unclaimed pages) the claim line.
 */
export function HowToBookPanel({ artist }: { artist: Artist }) {
  const first = firstName(artist.name)
  const igHandle = cleanHandle("instagram", artist.instagramHandle)
  const followers = followersLabel(artist.instagramFollowers)
  const stateName = STATE_ABBR_TO_NAME[artist.location.state] ?? artist.location.state
  const place = [artist.location.city, stateName].filter(Boolean).join(", ")
  const claimHref = artist.handle ? `/claim?artist=${encodeURIComponent(artist.handle)}` : "/claim"

  return (
    // Textured paper, opaque: on desktop the panel overlaps the cover strip.
    <NeatlineFrame className="bg-paper tex-paper">
      <section
        aria-labelledby="how-to-book-heading"
        className="flex flex-col gap-3 bg-paper tex-paper p-4 text-[15px] leading-[1.5] text-ink lg:p-5"
      >
        <h2 id="how-to-book-heading" className="font-heading text-[22px] leading-[1.15] text-balance lg:text-[24px]">
          How to book
        </h2>

        {artist.isPrivateStudio ? (
          <>
            <PrivateStudioLabel className="text-[15px]" />
            <p className="text-pretty">
              {first} works privately{place ? <> in <strong>{place}</strong></> : null}. There&apos;s no public studio
              address. You&apos;ll get the details when your appointment is set.
            </p>
          </>
        ) : (
          <p className="text-pretty">
            We don&apos;t have a studio address for {first} yet. Most artists book through Instagram DMs.
          </p>
        )}

        {igHandle && (
          <a
            href={profileUrl("instagram", igHandle)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-3 border-t border-rule py-1.5 text-ink hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border-1.5 border-ink bg-vellum tex-vellum">
              <SocialIcon network="instagram" />
            </span>
            <span className="flex flex-col gap-px">
              <span className="font-semibold">@{igHandle}</span>
              <span className="text-[13px] text-ink-muted">
                Instagram{followers ? `, ${followers}` : ""}.{artist.isPrivateStudio ? " Most artists book through DMs." : ""}
              </span>
            </span>
          </a>
        )}

        {artist.isClaimed && artist.acceptingClients === "no" ? (
          <p className="border-t border-rule pt-3 font-semibold">{first} isn&apos;t taking new clients right now.</p>
        ) : (
        <RequestIntroButton className="inline-flex min-h-12 items-center justify-center rounded border-1.5 border-ink bg-flash-red text-base font-semibold text-white hover:bg-flash-red/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          Request an intro
        </RequestIntroButton>
        )}

        {!artist.hasAccount && (
          <p className="text-[13px] leading-[1.45] text-ink-muted text-pretty">
            Are you {first}?{" "}
            <Link href={claimHref} className={TEXT_LINK}>
              Claim this page
            </Link>{" "}
            {artist.isPrivateStudio
              ? "to take requests directly. We never ask for a home address."
              : "to add your studio, or mark it as a private studio. We never ask for a home address."}
          </p>
        )}
      </section>
    </NeatlineFrame>
  )
}
