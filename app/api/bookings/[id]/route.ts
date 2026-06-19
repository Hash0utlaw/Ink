import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@/utils/supabase/server"
import { getBookingById, updateBookingStatus } from "@/lib/supabase/bookings"

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

    const resendKey = process.env.RESEND_API_KEY
    if (resendKey && booking.clientEmail) {
      const resend = new Resend(resendKey)
      const artistName = (artistRow as { display_name: string }).display_name ?? "the artist"
      const from = "TattooMaps <no-reply@tattoo-maps.com>"
      const reviewUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://tattoo-maps.com"}/review/${booking.id}`

      if (action === "confirm") {
        await resend.emails.send({
          from,
          to: booking.clientEmail,
          subject: `Your booking with ${artistName} is confirmed!`,
          html: `<p>Hi ${booking.clientName},</p>
                 <p><strong>${artistName}</strong> has confirmed your booking request.</p>
                 ${booking.preferredDate ? `<p><strong>Date:</strong> ${booking.preferredDate}</p>` : ""}
                 ${booking.description ? `<p><strong>Your idea:</strong> ${booking.description}</p>` : ""}
                 <p>The artist will be in touch with next steps.</p>`,
        }).catch(() => {})
      } else if (action === "decline") {
        await resend.emails.send({
          from,
          to: booking.clientEmail,
          subject: `Update on your booking request`,
          html: `<p>Hi ${booking.clientName},</p>
                 <p>Unfortunately, <strong>${artistName}</strong> is unable to take your booking at this time.</p>
                 <p>We encourage you to browse other talented artists on TattooMaps.</p>`,
        }).catch(() => {})
      } else if (action === "complete") {
        // Review request email — goes to client
        await resend.emails.send({
          from,
          to: booking.clientEmail,
          subject: `How was your session with ${artistName}? Leave a review`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
              <h2 style="color:#7C3AED;">How was your session?</h2>
              <p>Hi ${booking.clientName},</p>
              <p>Your session with <strong>${artistName}</strong> has been marked complete. We'd love to hear how it went!</p>
              <p style="margin:24px 0;">
                <a href="${reviewUrl}"
                   style="background:#7C3AED;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                  Leave a Review →
                </a>
              </p>
              <p style="color:#888;font-size:12px;">This link is unique to your booking and can only be used once.</p>
            </div>
          `,
        }).catch(() => {})
      }
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 })
  }
}
