import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { bookingId, rating, reviewText, clientName } = await req.json()

    if (!bookingId || !rating || !clientName) {
      return NextResponse.json({ error: "bookingId, rating, and clientName are required" }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    const supabase = createClient()

    // Verify booking exists and is completed
    const { data: booking, error: bookingError } = await supabase
      .from("booking_requests")
      .select("id, artist_id, client_name, status")
      .eq("id", bookingId)
      .maybeSingle()

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const b = booking as { id: string; artist_id: string; client_name: string; status: string }

    if (b.status !== "completed") {
      return NextResponse.json({ error: "Reviews can only be submitted for completed bookings" }, { status: 403 })
    }

    // Check no review already exists for this booking
    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("booking_request_id", bookingId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "A review has already been submitted for this booking" }, { status: 409 })
    }

    // Insert review
    const { data: review, error: insertError } = await supabase
      .from("reviews")
      .insert({
        booking_request_id: bookingId,
        artist_id: b.artist_id,
        client_name: clientName,
        rating,
        review_text: reviewText?.trim() || null,
        is_verified: true,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Roll up rating on the artist row
    await supabase.rpc("update_artist_rating", { p_artist_id: b.artist_id }).catch(() => {
      // Fallback: manual calculation if RPC doesn't exist yet
      return supabase
        .from("reviews")
        .select("rating")
        .eq("artist_id", b.artist_id)
        .then(({ data: ratings }) => {
          if (!ratings || ratings.length === 0) return
          const avg = ratings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / ratings.length
          return supabase
            .from("artists")
            .update({ rating: Math.round(avg * 10) / 10, review_count: ratings.length })
            .eq("id", b.artist_id)
        })
    })

    // Notify artist of the new review
    try {
      const { data: artist } = await supabase
        .from("artists")
        .select("display_name")
        .eq("id", b.artist_id)
        .maybeSingle()

      const { data: userRow } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("artist_id", b.artist_id)
        .maybeSingle()

      const artistEmail = (userRow as { email?: string } | null)?.email
      const artistName = (artist as { display_name?: string } | null)?.display_name ?? "Artist"
      const stars = "★".repeat(rating) + "☆".repeat(5 - rating)

      if (artistEmail) {
        await resend.emails.send({
          from: "TattooMaps <no-reply@tattoo-maps.com>",
          to: artistEmail,
          subject: `New ${rating}-star review from ${clientName}`,
          html: `
            <p>Hi ${artistName},</p>
            <p>${clientName} left you a ${rating}-star review:</p>
            <p style="font-size:24px;">${stars}</p>
            ${reviewText ? `<blockquote>${reviewText}</blockquote>` : ""}
            <p><a href="https://tattoo-maps.com/artist-dashboard">View your dashboard →</a></p>
          `,
        })
      }
    } catch {
      // email failure is non-fatal
    }

    return NextResponse.json({ success: true, review }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
