import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CopyOutreachButton, IntroStatusButtons, ClaimReviewButtons } from "@/components/admin/intro-actions"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { isAdmin } from "@/lib/admin"
import {
  INTRO_ARTIST_COLUMNS,
  INTRO_SHOP_COLUMNS,
  buildOutreachMailto,
  buildOutreachMessage,
  externalUrl,
  hoursSince,
  introShop,
  type IntroArtist,
} from "@/lib/intro-outreach"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Intros | TattooMaps Admin",
  robots: { index: false, follow: false },
}

interface WaitingRequest {
  id: string
  created_at: string
  outreach_status: "new" | "contacted"
  outreach_contacted_at: string | null
  size: string | null
  placement: string | null
  style: string | null
  preferred_date: string | null
  description: string | null
  artists: IntroArtist | null
}

interface PendingClaim {
  id: string
  created_at: string
  note: string | null
  claimant_name: string
  claimant_email: string
  claimant_phone: string | null
  instagram_handle: string | null
  artists: { id: string; display_name: string | null } | null
  shops: { name: string | null } | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
}

const linkClass = "text-sm font-semibold text-navy underline underline-offset-2 hover:no-underline"

export default async function AdminIntrosPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) notFound()

  const admin = createAdminClient()
  const [{ data: requestRows, error: requestError }, { data: claimRows, error: claimError }] = await Promise.all([
    admin
      .from("booking_requests")
      .select(
        `id, created_at, outreach_status, outreach_contacted_at, size, placement, style, preferred_date, description, artists(id, display_name, handle, ${INTRO_ARTIST_COLUMNS}, shops(${INTRO_SHOP_COLUMNS}))`,
      )
      .in("outreach_status", ["new", "contacted"])
      .order("created_at", { ascending: true }),
    admin
      .from("claim_requests")
      .select(
        "id, created_at, note, claimant_name, claimant_email, claimant_phone, instagram_handle, artists(id, display_name), shops(name)",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ])

  const requests = (requestRows ?? []) as unknown as WaitingRequest[]
  const claims = (claimRows ?? []) as unknown as PendingClaim[]
  const now = Date.now()

  return (
    <div className="flex min-h-screen flex-col bg-paper tex-paper">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 max-w-5xl space-y-12">
          <h1 className="font-heading text-[34px] leading-tight md:text-[44px]">Intros</h1>

          <section className="space-y-4">
            <h2 className="font-heading text-[26px] leading-tight">
              Waiting requests <span className="text-muted-foreground tabular-nums">({requests.length})</span>
            </h2>
            {requestError && <p className="text-sm text-destructive">{requestError.message}</p>}
            {requests.length === 0 && !requestError && (
              <p className="text-muted-foreground">Nothing waiting.</p>
            )}
            {requests.map((r) => {
              const artist = r.artists
              const shop = artist ? introShop(artist) : null
              const age = hoursSince(r.created_at, now)
              const overdue = age > 24 && r.outreach_status === "new"
              const summary = [r.size, r.placement, r.style].filter(Boolean).join(", ")
              const request = { size: r.size, placement: r.placement, style: r.style }
              const website = externalUrl(shop?.website)
              const facebook = externalUrl(shop?.facebook_url)
              const instagram = externalUrl(shop?.instagram_url)

              return (
                <Card key={r.id}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={overdue ? "destructive" : "secondary"}>{age}h</Badge>
                      <Badge variant="outline">{r.outreach_status}</Badge>
                      {artist ? (
                        <Link href={`/artists/${artist.id}`} className="font-semibold underline-offset-2 hover:underline">
                          {artist.display_name}
                        </Link>
                      ) : (
                        <span className="font-semibold">Unknown artist</span>
                      )}
                      {shop?.name && (
                        <span className="text-muted-foreground">
                          at {shop.name}
                          {shop.city || shop.state ? ` — ${[shop.city, shop.state].filter(Boolean).join(", ")}` : ""}
                        </span>
                      )}
                    </div>

                    <div className="text-sm">
                      {summary && <p className="font-medium">{summary}</p>}
                      {r.preferred_date && <p className="text-muted-foreground">Preferred date: {r.preferred_date}</p>}
                      {r.description && <p className="text-muted-foreground whitespace-pre-wrap">{r.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted {formatDate(r.created_at)}
                        {r.outreach_contacted_at ? `, contacted ${formatDate(r.outreach_contacted_at)}` : ""}
                      </p>
                    </div>

                    {artist && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {shop?.phone && (
                          <a href={`tel:${shop.phone.replace(/[^\d+]/g, "")}`} className={linkClass}>
                            {shop.phone}
                          </a>
                        )}
                        <a href={buildOutreachMailto(artist, request)} className={linkClass}>
                          {shop?.email ? `Email ${shop.email}` : "Email (no shop address)"}
                        </a>
                        {website && (
                          <a href={website} target="_blank" rel="noopener noreferrer" className={linkClass}>
                            Website
                          </a>
                        )}
                        {facebook && (
                          <a href={facebook} target="_blank" rel="noopener noreferrer" className={linkClass}>
                            Facebook
                          </a>
                        )}
                        {instagram && (
                          <a href={instagram} target="_blank" rel="noopener noreferrer" className={linkClass}>
                            Instagram
                          </a>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {artist && <CopyOutreachButton message={buildOutreachMessage(artist, request)} />}
                      <IntroStatusButtons bookingId={r.id} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-[26px] leading-tight">
              Pending claims <span className="text-muted-foreground tabular-nums">({claims.length})</span>
            </h2>
            {claimError && <p className="text-sm text-destructive">{claimError.message}</p>}
            {claims.length === 0 && !claimError && <p className="text-muted-foreground">No pending claims.</p>}
            {claims.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {c.artists ? (
                      <Link href={`/artists/${c.artists.id}`} className="font-semibold underline-offset-2 hover:underline">
                        {c.artists.display_name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{c.shops?.name ?? c.note ?? "Unlinked listing"}</span>
                    )}
                    {c.note && (c.artists || c.shops) && <span className="text-muted-foreground">— {c.note}</span>}
                  </div>
                  <div className="text-sm space-y-0.5">
                    <p>{c.claimant_name}</p>
                    <p>
                      <a href={`mailto:${c.claimant_email}`} className={linkClass}>
                        {c.claimant_email}
                      </a>
                    </p>
                    {c.claimant_phone && <p className="text-muted-foreground">{c.claimant_phone}</p>}
                    {c.instagram_handle && <p className="text-muted-foreground">Instagram: {c.instagram_handle}</p>}
                    <p className="text-xs text-muted-foreground">Submitted {formatDate(c.created_at)}</p>
                  </div>
                  <ClaimReviewButtons claimId={c.id} />
                </CardContent>
              </Card>
            ))}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
