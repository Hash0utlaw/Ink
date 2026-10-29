import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@/utils/supabase/server"
import { getBookingById, updateBookingStatus } from "@/lib/supabase/bookings"
import { FROM_EMAIL, REPLY_TO } from "@/lib/site-config"
import { siteUrl } from "@/lib/email/layout"
import { bookingConfirmedEmail, bookingDeclinedEmail, reviewRequestEmail } from "@/lib/email/templates"
import { reviewToken } from "@/lib/review-token"

export const dynamic = "force-dynamic"

const VALID_ACTIONS = ["confirm", "decline", "complete"] as const
type Action = typeof VALID_ACTIONS[number]

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { action } = await request.json() as { action: Action }
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const booking = await getBookingById(params.id)
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })

    const { data: artistRow } = await supabase
      .from("artists")
      .select("id, display_name")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!artistRow || (artistRow as { id: string }).id !== booking.artistId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const newStatus = action === "confirm" ? "confirmed" : action === "decline" ? "declined" : "completed"
    const { error: updateError } = await updateBookingStatus(params.id, newStatus)
    if (updateError) return NextResponse.json({ error: updateError }, { status: 500 })

    // The review link is signed; without REVIEW_LINK_SECRET no review email goes out.
    const token = action === "complete" ? reviewToken(booking.id) : null
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey && booking.clientEmail && (action !== "complete" || token)) {
      const resend = new Resend(resendKey)
      const artistName = (artistRow as { display_name: string }).display_name ?? "the artist"
      const from = FROM_EMAIL
      const message =
        action === "confirm"
          ? bookingConfirmedEmail({
              clientName: booking.clientName,
              artistName,
              preferredDate: booking.preferredDate,
              description: booking.description,
            })
          : action === "decline"
            ? bookingDeclinedEmail({ clientName: booking.clientName, artistName })
            : reviewRequestEmail({ clientName: booking.clientName, artistName, reviewUrl: siteUrl(`/review/${booking.id}?t=${token}`) })

      await resend.emails
        .send({
          from,
          to: booking.clientEmail,
          replyTo: REPLY_TO,
          subject: message.subject,
          html: message.html,
          text: message.text,
        })
        .catch(() => {})
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 })
  }
}
