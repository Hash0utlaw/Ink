import Link from "next/link"
import type { Artist } from "@/types/artist"
import { Plate } from "@/components/brand/plate"
import { StyleBadge } from "@/components/brand/style-badge"
import { EmptyBox, ProfileSection } from "@/components/artist-profile/profile-sections"
import { styleEntries } from "@/lib/styles"
import { allowedImageSrc } from "@/lib/utils/safe-image"

function ArtistPlate({ artist }: { artist: Artist }) {
  // Stubs (from shop_artists) have no profile page: name only, no photo, no link.
  const photo = artist.isStub ? null : allowedImageSrc(artist.avatarUrl)
  const styles = artist.isStub ? [] : styleEntries(artist.styles).slice(0, 2)
  return (
    <>
      <Plate
        src={photo}
        alt={photo ? artist.name : `${artist.name} initials`}
        name={artist.name}
        primaryStyle={artist.isStub ? null : artist.styles[0]}
        fluid
        sizes="(min-width: 1024px) 270px, 45vw"
      />
      <span className="mt-3 block font-heading text-[19px] leading-tight text-ink text-balance lg:text-[21px]">
        {artist.name}
      </span>
      {styles.length > 0 && (
        <span className="mt-2 flex flex-wrap gap-1.5">
          {styles.map(({ slug, label }) => (
            <StyleBadge key={slug} slug={slug} label={label} />
          ))}
        </span>
      )}
    </>
  )
}

/** Every artist at the shop as plates, 2 across on mobile and 4 on desktop. */
export function ShopArtists({ shopName, artists }: { shopName: string; artists: Artist[] }) {
  return (
    <ProfileSection
      id="artists"
      title={
        <>
          Artists at {shopName}
          {artists.length > 0 && <span className="ml-2 tabular-nums text-ink-muted">{artists.length}</span>}
        </>
      }
    >
      {artists.length === 0 ? (
        <EmptyBox title="No artists listed yet.">If you work here, claim this shop to add your team.</EmptyBox>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
          {artists.map((artist) => (
            <li key={artist.id} className="min-w-0">
              {artist.isStub ? (
                <div className="p-2">
                  <ArtistPlate artist={artist} />
                </div>
              ) : (
                <Link
                  href={`/artists/${artist.id}`}
                  className="block rounded-lg border-1.5 border-transparent p-2 hover:border-ink hover:bg-vellum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ArtistPlate artist={artist} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </ProfileSection>
  )
}
