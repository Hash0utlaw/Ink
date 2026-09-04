import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@/utils/supabase/server"
import { getArtistById } from "@/lib/supabase/artists"
import { getUserProfile } from "@/lib/supabase/users"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      artistId,
      clientName,
      clientEmail,
      clientPhone,
      preferredDate,
      description,
      size,
      placement,
      style,
      budget,
    } = body

    const supabase = createClient()

    const { error: dbError } = await supabase.from("booking_requests").insert({
      artist_id: artistId,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone ?? null,
      preferred_date: preferredDate ?? null,
      description: description ?? null,
      size: size ?? null,
      placement: placement ?? null,
      style: style ?? null,
      budget: budget ?? null,
      created_at: new Date().toISOString(),
    })

    if (dbError) {
      return NextResponse.json({ success: false, message: dbError.message }, { status: 500 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "TattooMaps <bookings@tattoo-maps.com>"

    const artist = await getArtistById(artistId)
    const artistName = artist?.name ?? "the artist"

    // Look up artist email: artists.id -> artists.user_id -> user_profiles.email
    const { data: artistRow } = await supabase
      .from("artists")
      .select("user_id")
      .eq("id", artistId)
      .maybeSingle()

    let artistEmail: string | null = null
    const artistUserId = (artistRow as { user_id?: string } | null)?.user_id
    if (artistUserId) {
      const profile = await getUserProfile(artistUserId)
      artistEmail = profile?.email ?? null
    }

    let artistNotified = false

    if (artistEmail) {
      const { error: artistEmailError } = await resend.emails.send({
        from: fromAddress,
        to: artistEmail,
        subject: `New booking request from ${clientName}`,
        html: `<p>You have a new booking request from <strong>${clientName}</strong>.</p>
               <p><strong>Email:</strong> ${clientEmail}</p>
               ${clientPhone ? `<p><strong>Phone:</strong> ${clientPhone}</p>` : ""}
               ${preferredDate ? `<p><strong>Preferred date:</strong> ${preferredDate}</p>` : ""}
               ${description ? `<p><strong>Description:</strong> ${description}</p>` : ""}
               ${size ? `<p><strong>Size:</strong> ${size}</p>` : ""}
               ${placement ? `<p><strong>Placement:</strong> ${placement}</p>` : ""}`,
      })
      artistNotified = !artistEmailError
    }

    if (!artistNotified) {
      console.warn(`Booking ${clientEmail} -> artist ${artistId}: artist was not notified (no verified email on file)`)
    }

    const clientEmailContent = artistNotified
      ? {
          subject: `Your request was sent to ${artistName}`,
          html: `<p>Hi ${clientName},</p>
                 <p>Your booking request has been sent to <strong>${artistName}</strong>.</p>
                 <p>They will review your request and get back to you within 24 hours.</p>`,
        }
      : {
          subject: `We received your request for ${artistName}`,
          html: `<p>Hi ${clientName},</p>
                 <p>Thanks for your interest in <strong>${artistName}</strong> — we've saved your request.</p>
                 <p>${artistName} hasn't claimed their TattooMaps profile yet, so we're reaching out to
                 personally invite them to respond. We'll email you the moment they do.</p>
                 <p>Thanks for your patience!</p>`,
        }

    await resend.emails.send({
      from: fromAddress,
      to: clientEmail,
      subject: clientEmailContent.subject,
      html: clientEmailContent.html,
    })

    return NextResponse.json({ success: true, artistNotified })
  } catch (error) {
    console.error("Booking error:", error)
    return NextResponse.json({ success: false, message: "Failed to create booking" }, { status: 500 })
  }
}
