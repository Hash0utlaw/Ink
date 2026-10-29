import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { Resend } from "resend"
import { FROM_EMAIL, REPLY_TO } from "@/lib/site-config"
import { newReviewArtistEmail } from "@/lib/email/templates"
import { isValidReviewToken } from "@/lib/review-token"
import { MAX, isBot, optionalText } from "@/lib/validation"
import { RATE_LIMIT_MESSAGE, allowRequest } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

// Reviews come only from the signed "Leave a review" link for a completed
// booking. Reads and the insert use the service role (clients have no insert
// grant on reviews). The reviewer name is the one on the booking.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (isBot(body)) return NextResponse.json({ success: true }, { status: 201 })

    const { bookingId, token, rating } = body
    if (typeof bookingId !== "string" || !isValidReviewToken(bookingId, token)) {
      return NextResponse.json({ error: "This review link isn't valid." }, { status: 403 })
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be a whole number from 1 to 5" }, { status: 400 })
    }
    const reviewText = optionalText(body.reviewText, MAX.review)
    if (reviewText === undefined) {
      return NextResponse.json({ error: `Keep the review to ${MAX.review.toLocaleString()} characters or fewer.` }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: booking } = await admin
      .from("booking_requests")
      .select("id, artist_id, client_name, client_email, status")
      .eq("id", bookingId)
      .maybeSingle()
    const b = booking as { id: string; artist_id: string | null; client_name: string | null; client_email: string | null; status: string } | null
    if (!b || !b.artist_id) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }
    if (b.status !== "completed") {
      return NextResponse.json({ error: "Reviews can only be submitted for completed bookings" }, { status: 403 })
    }

    if (!(await allowRequest(req, "review", b.client_email))) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
    }

    const clientName = b.client_name?.trim() || "A client"

    // One review per booking (also a unique constraint on booking_request_id).
    const { data: review, error: insertError } = await admin
      .from("reviews")
      .insert({
        booking_request_id: b.id,
        artist_id: b.artist_id,
        client_name: clientName,
        rating,
        review_text: reviewText,
        is_verified: true,
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "A review has already been submitted for this booking" }, { status: 409 })
      }
      console.error("[reviews] insert failed:", insertError.message)
      return NextResponse.json({ error: "Failed to save the review" }, { status: 500 })
    }

    // Roll up rating on the artist row
    const { error: rpcError } = await admin.rpc("update_artist_rating", { p_artist_id: b.artist_id })
    if (rpcError) console.error("[reviews] update_artist_rating failed:", rpcError.message)

    // Notify artist of the new review
    try {
      const { data: artist } = await admin
        .from("artists")
        .select("display_name, user_id")
        .eq("id", b.artist_id)
        .maybeSingle()

      const artistRow = artist as { display_name?: string; user_id?: string } | null
      const artistName = artistRow?.display_name ?? "Artist"
      let artistEmail: string | undefined
      if (artistRow?.user_id) {
        const { data: profile } = await admin.from("user_profiles").select("email").eq("id", artistRow.user_id).maybeSingle()
        artistEmail = (profile as { email?: string | null } | null)?.email ?? undefined
      }

      if (artistEmail) {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const message = newReviewArtistEmail({ artistName, clientName, rating, reviewText })
        await resend.emails.send({
          from: FROM_EMAIL,
          to: artistEmail,
          replyTo: REPLY_TO,
          subject: message.subject,
          html: message.html,
          text: message.text,
        })
      }
    } catch {
      // email failure is non-fatal
    }

    return NextResponse.json({ success: true, review }, { status: 201 })
  } catch (e) {
    console.error("[reviews] error:", e)
    return NextResponse.json({ error: "Failed to save the review" }, { status: 500 })
  }
}
