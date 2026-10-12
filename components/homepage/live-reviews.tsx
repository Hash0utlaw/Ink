"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, Zap } from "lucide-react"
import { getClient } from "@/utils/supabase/client"
import type { Review } from "@/lib/supabase/reviews"
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js"
import { initials } from "@/lib/initials"
import { displayName } from "@/lib/display-name"


function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface LiveReviewsProps {
  initialReviews: Review[]
}

export function LiveReviews({ initialReviews }: LiveReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)

  useEffect(() => {
    const supabase = getClient()
    if (!supabase) return

    const channel = supabase
      .channel("reviews-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reviews" },
        async (payload: RealtimePostgresInsertPayload<{ id: string }>) => {
          // Fetch full row with artist join
          const { data } = await supabase
            .from("reviews")
            .select("*, artists(display_name, handle, avatar_url)")
            .eq("id", payload.new.id)
            .maybeSingle()

          if (!data) return

          const row = data as Record<string, unknown>
          const artist = row.artists
            ? (Array.isArray(row.artists) ? row.artists[0] : row.artists) as Record<string, unknown>
            : null

          const newReview: Review = {
            id: String(row.id ?? ""),
            bookingRequestId: row.booking_request_id != null ? String(row.booking_request_id) : null,
            artistId: String(row.artist_id ?? ""),
            artistName: displayName(String(artist?.display_name ?? "")),
            artistHandle: String(artist?.handle ?? ""),
            artistAvatar: String(artist?.avatar_url ?? ""),
            clientName: String(row.client_name ?? ""),
            rating: Number(row.rating ?? 5),
            reviewText: row.review_text != null ? String(row.review_text) : null,
            createdAt: String(row.created_at ?? ""),
            isVerified: Boolean(row.is_verified ?? true),
          }

          setReviews((prev) => [newReview, ...prev].slice(0, 8))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <section aria-labelledby="live-reviews-heading" className="mx-auto w-full max-w-[1344px] px-6">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 id="live-reviews-heading" className="flex items-center gap-3 text-[30px] leading-[1.15] text-ink md:text-[34px]">
            <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full border-1.5 border-ink bg-success" />
            Live Reviews
          </h2>
          <Link href="/artists" className="font-semibold text-navy underline underline-offset-2 hover:no-underline">
            Find an artist
          </Link>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded border-1.5 border-ink bg-vellum tex-vellum p-5">
            <p className="font-semibold text-ink">No reviews yet</p>
            <p className="mt-1 text-[15px] text-ink-muted">
              Reviews from real bookings will appear here as clients rate their artists.
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {reviews.map((review) => (
            <Link
              key={review.id}
              href={`/artists/${review.artistId}`}
              className="group flex gap-3 rounded border-1.5 border-ink bg-vellum tex-vellum p-4 hover:bg-secondary"
            >
              <Avatar className="w-10 h-10 shrink-0 border border-ink">
                <AvatarImage src={review.artistAvatar} alt={review.artistName} />
                <AvatarFallback className="text-xs bg-vellum text-ink font-heading border-1.5 border-ink">
                  {initials(review.artistName)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground truncate">
                    {review.clientName} on <span className="text-foreground">{review.artistName}</span>
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(review.createdAt)}</span>
                </div>

                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3 h-3 ${s <= review.rating ? "text-flash-yellow fill-flash-yellow" : "text-muted-foreground/20"}`}
                    />
                  ))}
                  <span className="ml-1.5 text-xs font-semibold">{review.rating}.0</span>
                  <span className="ml-1 text-xs text-success flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" /> Verified booking
                  </span>
                </div>

                {review.reviewText && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{review.reviewText}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
        )}
    </section>
  )
}

export function LiveReviewsSkeleton() {
  return (
    <section className="mx-auto w-full max-w-[1344px] px-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="h-3 w-3 rounded-full border-1.5 border-ink bg-success" />
        <div className="h-8 w-40 rounded bg-muted animate-pulse" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded bg-muted animate-pulse" />
        ))}
      </div>
    </section>
  )
}
