import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { ADMIN_NOTIFY_EMAIL, FROM_EMAIL, REPLY_TO } from "@/lib/site-config"
import { escapeHtml } from "@/lib/escape-html"
import { hoursAgo, isNonEmptyString, isValidEmail } from "@/lib/validation"
import { buildIntroAlertEmail, INTRO_SHOP_COLUMNS, introShop, type IntroArtist, type IntroRequest } from "@/lib/intro-outreach"
import { requestNextStep } from "@/lib/request-copy"

export const dynamic = "force-dynamic"

const MAX_NAME_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 5000
const MAX_REQUESTS_PER_DAY = 5

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

    if (
      !isNonEmptyString(artistId) ||
      !isNonEmptyString(clientName) ||
      clientName.length > MAX_NAME_LENGTH ||
      !isValidEmail(clientEmail) ||
      (description != null && (typeof description !== "string" || description.length > MAX_DESCRIPTION_LENGTH))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Please provide the artist, your name (up to ${MAX_NAME_LENGTH} characters), a valid email, and a description of up to ${MAX_DESCRIPTION_LENGTH.toLocaleString()} characters.`,
        },
        { status: 400 },
      )
    }

    const email = clientEmail.trim()
    const admin = createAdminClient()

    const { count: recentRequests } = await admin
      .from("booking_requests")
      .select("id", { count: "exact", head: true })
      .ilike("client_email", email.replace(/[\\%_]/g, (ch) => `\\${ch}`))
      .gte("created_at", hoursAgo(24))
    if ((recentRequests ?? 0) >= MAX_REQUESTS_PER_DAY) {
      return NextResponse.json(
        { success: false, message: "You've sent several requests today. Please try again tomorrow." },
        { status: 429 },
      )
    }

    const { data: artistData } = await admin
      .from("artists")
      .select(`id, display_name, handle, user_id, shop_id, shops(${INTRO_SHOP_COLUMNS})`)
      .eq("id", artistId)
      .maybeSingle()

    if (!artistData) {
      return NextResponse.json({ success: false, message: "Artist not found" }, { status: 400 })
    }

    const artistRow = artistData as unknown as IntroArtist & { user_id: string | null; shop_id: string | null }
    const isUnclaimed = !artistRow.user_id
    const createdAt = new Date().toISOString()

    const supabase = createClient()

    const { error: dbError } = await supabase.from("booking_requests").insert({
      artist_id: artistId,
      shop_id: artistRow.shop_id ?? null,
      client_name: clientName.trim(),
      client_email: email,
      client_phone: clientPhone ?? null,
      preferred_date: preferredDate ?? null,
      description: description ?? "",
      size: size ?? null,
      placement: placement ?? null,
      style: style ?? null,
      budget: budget ?? null,
      outreach_status: isUnclaimed ? "new" : null,
      created_at: createdAt,
    })

    if (dbError) {
      return NextResponse.json({ success: false, message: dbError.message }, { status: 500 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromAddress = FROM_EMAIL
    const artistName = artistRow.display_name || "the artist"

    // Look up artist email: artists.user_id -> user_profiles.email (service role —
    // RLS hides other users' profiles from the anon client).
    let artistEmail: string | null = null
    if (artistRow.user_id) {
      const { data: profile } = await admin
        .from("user_profiles")
        .select("email")
        .eq("id", artistRow.user_id)
        .maybeSingle()
      artistEmail = (profile as { email?: string | null } | null)?.email ?? null
    }

    const safe = {
      clientName: escapeHtml(clientName),
      clientEmail: escapeHtml(email),
      clientPhone: escapeHtml(clientPhone),
      preferredDate: escapeHtml(preferredDate),
      description: escapeHtml(description),
      size: escapeHtml(size),
      placement: escapeHtml(placement),
      artistName: escapeHtml(artistName),
    }

    let artistNotified = false

    if (artistEmail) {
      const { error: artistEmailError } = await resend.emails.send({
        from: fromAddress,
        to: artistEmail,
        replyTo: REPLY_TO,
        subject: `New booking request from ${clientName}`,
        html: `<p>You have a new booking request from <strong>${safe.clientName}</strong>.</p>
               <p><strong>Email:</strong> ${safe.clientEmail}</p>
               ${clientPhone ? `<p><strong>Phone:</strong> ${safe.clientPhone}</p>` : ""}
               ${preferredDate ? `<p><strong>Preferred date:</strong> ${safe.preferredDate}</p>` : ""}
               ${description ? `<p><strong>Description:</strong> ${safe.description}</p>` : ""}
               ${size ? `<p><strong>Size:</strong> ${safe.size}</p>` : ""}
               ${placement ? `<p><strong>Placement:</strong> ${safe.placement}</p>` : ""}`,
      })
      artistNotified = !artistEmailError
    }

    if (!artistNotified) {
      console.warn(`Booking -> artist ${artistId}: artist was not notified (no verified email on file)`)
    }

    // Instant admin alert for unclaimed artists. Failures must not fail the booking.
    if (isUnclaimed && ADMIN_NOTIFY_EMAIL) {
      try {
        const introRequest: IntroRequest = {
          size: size ?? null,
          placement: placement ?? null,
          style: style ?? null,
          preferredDate: preferredDate ?? null,
          description: description ?? null,
          createdAt,
        }
        const alert = buildIntroAlertEmail(artistRow, introRequest)
        const { data: alertData, error: alertError } = await resend.emails.send({
          from: fromAddress,
          to: ADMIN_NOTIFY_EMAIL,
          subject: alert.subject,
          html: alert.html,
        })
        if (alertError) console.error("[bookings] intro alert failed:", alertError.message)
        else console.info(`[bookings] intro alert sent id=${alertData?.id}`)
      } catch (alertErr) {
        console.error("[bookings] intro alert failed:", alertErr)
      }
    }

    // Same next step as the form (lib/request-copy.ts); no response-time promises.
    const nextStep = escapeHtml(
      requestNextStep({ name: artistName, shopName: introShop(artistRow)?.name, hasAccount: false }),
    )
    const clientEmailContent = artistNotified
      ? {
          subject: `Your request was sent to ${artistName}`,
          html: `<p>Hi ${safe.clientName},</p>
                 <p>Your booking request has been sent to <strong>${safe.artistName}</strong>.</p>
                 <p>They'll review it and get back to you.</p>`,
        }
      : isUnclaimed
        ? {
            subject: `We received your request for ${artistName}`,
            html: `<p>Hi ${safe.clientName},</p>
                   <p>Thanks for your interest in <strong>${safe.artistName}</strong>. We've saved your request.</p>
                   <p>${safe.artistName} hasn't claimed their TattooMaps page yet. ${nextStep}</p>`,
          }
        : {
            subject: `We received your request for ${artistName}`,
            html: `<p>Hi ${safe.clientName},</p>
                   <p>Thanks for your interest in <strong>${safe.artistName}</strong>. We've saved your request.</p>`,
          }

    const { data: clientData } = await resend.emails.send({
      from: fromAddress,
      to: email,
      replyTo: REPLY_TO,
      subject: clientEmailContent.subject,
      html: clientEmailContent.html,
    })
    if (clientData?.id) console.info(`[bookings] client email sent id=${clientData.id}`)

    return NextResponse.json({ success: true, artistNotified })
  } catch (error) {
    console.error("Booking error:", error)
    return NextResponse.json({ success: false, message: "Failed to create booking" }, { status: 500 })
  }
}
