import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createAdminClient } from "@/utils/supabase/admin"
import { getArtistBySlug } from "@/lib/supabase/artists"
import { getShopBySlug } from "@/lib/supabase/shops"
import { ADMIN_NOTIFY_EMAIL, FROM_EMAIL, REPLY_TO } from "@/lib/site-config"
import { claimAdminEmail, claimReceiptEmail } from "@/lib/email/templates"
import { MAX, isBot, isValidEmail, optionalText, requiredText } from "@/lib/validation"
import { RATE_LIMIT_MESSAGE, allowRequest } from "@/lib/rate-limit"
import { isWorkplace } from "@/lib/workplace"

export const dynamic = "force-dynamic"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (isBot(body)) return NextResponse.json({ success: true })

    const { artistSlug, shopSlug, workplace, workplaceShopId } = body
    const name = requiredText(body.name, MAX.name)
    const phone = optionalText(body.phone, MAX.phone)
    const instagram = optionalText(body.instagram, MAX.short)
    const listing = requiredText(body.listing, MAX.listing)

    if (!name || !isValidEmail(body.email) || !listing || phone === undefined || instagram === undefined) {
      return NextResponse.json(
        { success: false, message: "Please provide your name, a valid email and the listing." },
        { status: 400 },
      )
    }

    const claimantEmail = body.email.trim()

    if (!(await allowRequest(request, "claim", claimantEmail))) {
      return NextResponse.json({ success: false, message: RATE_LIMIT_MESSAGE }, { status: 429 })
    }

    const admin = createAdminClient()

    const [artist, shop] = await Promise.all([
      typeof artistSlug === "string" && artistSlug ? getArtistBySlug(artistSlug) : Promise.resolve(null),
      typeof shopSlug === "string" && shopSlug ? getShopBySlug(shopSlug) : Promise.resolve(null),
    ])

    // "Where do you work?" (artist claims only); applied by approveClaim. Never an address.
    const workplaceFields =
      artist && isWorkplace(workplace)
        ? {
            workplace,
            workplace_shop_id: workplace === "shop" && typeof workplaceShopId === "string" && UUID.test(workplaceShopId) ? workplaceShopId : null,
          }
        : {}

    // Service role: clients have no insert grant on claim_requests.
    const { error: dbError } = await admin.from("claim_requests").insert({
      ...workplaceFields,
      artist_id: artist?.id ?? null,
      shop_id: shop?.id ?? null,
      claimant_name: name,
      claimant_email: claimantEmail,
      claimant_phone: phone,
      instagram_handle: instagram,
      note: listing,
      status: "pending",
      created_at: new Date().toISOString(),
    })

    if (dbError) {
      console.error("[claims] insert failed:", dbError.message)
      return NextResponse.json({ success: false, message: "Failed to submit claim" }, { status: 500 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromAddress = FROM_EMAIL
    const notifyEmail = ADMIN_NOTIFY_EMAIL ?? fromAddress.match(/<(.+)>/)?.[1] ?? fromAddress

    const toAdmin = claimAdminEmail({ listing, name, email: claimantEmail, phone, instagram })
    const toClaimant = claimReceiptEmail({ name, listing })

    const emailPromises: Promise<unknown>[] = [
      resend.emails.send({
        from: fromAddress,
        to: notifyEmail,
        subject: toAdmin.subject,
        html: toAdmin.html,
        text: toAdmin.text,
      }),
      resend.emails.send({
        from: fromAddress,
        to: claimantEmail,
        replyTo: REPLY_TO,
        subject: toClaimant.subject,
        html: toClaimant.html,
        text: toClaimant.text,
      }),
    ]

    await Promise.allSettled(emailPromises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Claim error:", error)
    return NextResponse.json({ success: false, message: "Failed to submit claim" }, { status: 500 })
  }
}
