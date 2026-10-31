import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { ADMIN_NOTIFY_EMAIL, FROM_EMAIL, REPLY_TO } from "@/lib/site-config"
import { newRequestArtistEmail, requestReceiptEmail } from "@/lib/email/templates"
import { MAX, isBot, isNonEmptyString, isValidEmail, optionalDate, optionalText, requiredText } from "@/lib/validation"
import { RATE_LIMIT_MESSAGE, allowRequest } from "@/lib/rate-limit"
import { buildIntroAlertEmail, INTRO_ARTIST_COLUMNS, INTRO_SHOP_COLUMNS, introShop, type IntroArtist, type IntroRequest } from "@/lib/intro-outreach"
import { requestNextStep } from "@/lib/request-copy"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (isBot(body)) return NextResponse.json({ success: true, artistNotified: false })

    const { artistId } = body
    const clientName = requiredText(body.clientName, MAX.name)
    const clientPhone = optionalText(body.clientPhone, MAX.phone)
    const preferredDate = optionalDate(body.preferredDate)
    const description = optionalText(body.description, MAX.message)
    const size = optionalText(body.size, MAX.short)
    const placement = optionalText(body.placement, MAX.short)
    const style = optionalText(body.style, MAX.short)
    const budget = optionalText(body.budget, MAX.short)

    if (
      !isNonEmptyString(artistId) ||
      !clientName ||
      !isValidEmail(body.clientEmail) ||
      [clientPhone, preferredDate, description, size, placement, style, budget].includes(undefined)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Please provide the artist, your name (up to ${MAX.name} characters), a valid email, and a description of up to ${MAX.message.toLocaleString()} characters.`,
        },
        { status: 400 },
      )
    }

    const email = body.clientEmail.trim()

    if (!(await allowRequest(request, "booking", email))) {
      return NextResponse.json({ success: false, message: RATE_LIMIT_MESSAGE }, { status: 429 })
    }

    const admin = createAdminClient()

    const { data: artistData } = await admin
      .from("artists")
      .select(`id, display_name, handle, user_id, shop_id, ${INTRO_ARTIST_COLUMNS}, shops(${INTRO_SHOP_COLUMNS})`)
      .eq("id", artistId)
      .maybeSingle()

    if (!artistData) {
      return NextResponse.json({ success: false, message: "Artist not found" }, { status: 400 })
    }

    const artistRow = artistData as unknown as IntroArtist & { user_id: string | null; shop_id: string | null }

    // "Not right now" (Round 12): the page shows no form, and requests are refused here too.
    // A separate read, so a database without the column yet (error) doesn't block requests.
    const { data: accepting } = await admin.from("artists").select("accepting_clients, is_claimed").eq("id", artistId).maybeSingle()
    const acceptingRow = accepting as { accepting_clients?: string | null; is_claimed?: boolean | null } | null
    if (acceptingRow?.is_claimed && acceptingRow.accepting_clients === "no") {
      return NextResponse.json(
        { success: false, message: `${artistRow.display_name} isn't taking new clients right now.` },
        { status: 409 },
      )
    }
    const isUnclaimed = !artistRow.user_id
    const createdAt = new Date().toISOString()

    // Signed in? Tie the request to the account so it shows on their dashboard.
    const {
      data: { user },
    } = await createClient().auth.getUser()

    // Service role: clients have no insert grant on booking_requests.
    const { error: dbError } = await admin.from("booking_requests").insert({
      artist_id: artistId,
      shop_id: artistRow.shop_id ?? null,
      client_user_id: user?.id ?? null,
      client_name: clientName,
      client_email: email,
      client_phone: clientPhone,
      preferred_date: preferredDate,
      description: description ?? "",
      size,
      placement,
      style,
      budget,
      outreach_status: isUnclaimed ? "new" : null,
      created_at: createdAt,
    })

    if (dbError) {
      console.error("[bookings] insert failed:", dbError.message)
      return NextResponse.json({ success: false, message: "Failed to create booking" }, { status: 500 })
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

    let artistNotified = false

    if (artistEmail) {
      const toArtist = newRequestArtistEmail({
        clientName,
        clientEmail: email,
        clientPhone,
        preferredDate,
        description,
        size,
        placement,
      })
      const { error: artistEmailError } = await resend.emails.send({
        from: fromAddress,
        to: artistEmail,
        replyTo: REPLY_TO,
        subject: toArtist.subject,
        html: toArtist.html,
        text: toArtist.text,
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
          text: alert.text,
        })
        if (alertError) console.error("[bookings] intro alert failed:", alertError.message)
        else console.info(`[bookings] intro alert sent id=${alertData?.id}`)
      } catch (alertErr) {
        console.error("[bookings] intro alert failed:", alertErr)
      }
    }

    // Same next step as the form (lib/request-copy.ts); no response-time promises.
    const nextStep = requestNextStep({
      name: artistName,
      shopName: introShop(artistRow)?.name,
      hasAccount: false,
      hasInstagram: Boolean(artistRow.instagram_handle?.trim()),
    })
    const clientEmailContent = requestReceiptEmail(
      artistNotified
        ? { kind: "sent", clientName, artistName }
        : isUnclaimed
          ? { kind: "unclaimed", clientName, artistName, nextStep }
          : { kind: "saved", clientName, artistName },
    )

    const { data: clientData } = await resend.emails.send({
      from: fromAddress,
      to: email,
      replyTo: REPLY_TO,
      subject: clientEmailContent.subject,
      html: clientEmailContent.html,
      text: clientEmailContent.text,
    })
    if (clientData?.id) console.info(`[bookings] client email sent id=${clientData.id}`)

    return NextResponse.json({ success: true, artistNotified })
  } catch (error) {
    console.error("Booking error:", error)
    return NextResponse.json({ success: false, message: "Failed to create booking" }, { status: 500 })
  }
}
