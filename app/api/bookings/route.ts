import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@/utils/supabase/server"
import { getArtistById } from "@/lib/mock-data"

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
      created_at: new Date().toISOString(),
    })

    if (dbError) {
      return NextResponse.json({ success: false, message: dbError.message }, { status: 500 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromAddress = "Inkfinder <onboarding@resend.dev>"

    const artist = await getArtistById(artistId)
    const artistName = artist?.name ?? "the artist"

    // Look up artist email from user_profiles
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("user_id", artistId)
      .maybeSingle()

    const artistEmail: string | null = (profile as { email?: string } | null)?.email ?? null

    const emailPromises: Promise<unknown>[] = []

    if (artistEmail) {
      emailPromises.push(
        resend.emails.send({
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
      )
    }

    emailPromises.push(
      resend.emails.send({
        from: fromAddress,
        to: clientEmail,
        subject: `Your request was sent to ${artistName}`,
        html: `<p>Hi ${clientName},</p>
               <p>Your booking request has been sent to <strong>${artistName}</strong>.</p>
               <p>They will review your request and get back to you within 24 hours.</p>`,
      })
    )

    await Promise.allSettled(emailPromises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Booking error:", error)
    return NextResponse.json({ success: false, message: "Failed to create booking" }, { status: 500 })
  }
}
