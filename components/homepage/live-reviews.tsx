"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, ArrowRight, Zap } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import type { Review } from "@/lib/supabase/reviews"

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
}

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
    const supabase = createClient()

    const channel = supabase
      .channel("reviews-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reviews" },
        async (payload) => {
          // Fetch full row with artist join
          const { data } = await supabase
            .from("reviews")
            .select("*, artists(display_name, handle, avatar_url)")
            .eq("id", (payload.new as { id: string }).id)
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
            artistName: String(artist?.display_name ?? ""),
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

  if (reviews.length === 0) return null

  return (
    <section className="py-12 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-ping absolute" />
              <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            <h2 className="text-2xl font-extrabold">Live Reviews</h2>
          </div>
          <Link href="/artists" className="flex items-center gap-1 text-sm text-[#7C3AED] hover:underline">
            Find an artist <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {reviews.map((review) => (
            <Link
              key={review.id}
              href={`/artists/${review.artistId}`}
              className="group flex gap-3 p-4 rounded-xl border border-border/50 bg-card hover:border-[#7C3AED]/40 transition-all"
            >
              <Avatar className="w-10 h-10 shrink-0 border border-accent/30">
                <AvatarImage src={review.artistAvatar} alt={review.artistName} />
                <AvatarFallback className="text-xs font-bold bg-accent/10 text-accent">
                  {initials(review.artistName)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground truncate">
                    {review.clientName} → <span className="text-foreground">{review.artistName}</span>
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(review.createdAt)}</span>
                </div>

                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3 h-3 ${s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20"}`}
                    />
                  ))}
                  <span className="ml-1.5 text-xs font-semibold">{review.rating}.0</span>
                  <span className="ml-1 text-xs text-green-500 flex items-center gap-0.5">
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
      </div>
    </section>
  )
}

export function LiveReviewsSkeleton() {
  return (
    <section className="py-12 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <div className="h-7 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  )
}
