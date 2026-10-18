import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { getArtistBySlug } from "@/lib/supabase/artists"
import { getShopBySlug } from "@/lib/supabase/shops"
import { ADMIN_NOTIFY_EMAIL, FROM_EMAIL, REPLY_TO } from "@/lib/site-config"
import { claimAdminEmail, claimReceiptEmail } from "@/lib/email/templates"
import { hoursAgo, isNonEmptyString, isValidEmail } from "@/lib/validation"
import { isWorkplace } from "@/lib/workplace"

export const dynamic = "force-dynamic"

const MAX_CLAIMS_PER_DAY = 5
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    const { artistSlug, shopSlug, name, email, phone, instagram, listing, workplace, workplaceShopId } = await request.json()

    if (!isNonEmptyString(name) || !isValidEmail(email) || !isNonEmptyString(listing)) {
      return NextResponse.json(
        { success: false, message: "Please provide your name, a valid email and the listing." },
        { status: 400 },
      )
    }

    const claimantEmail = email.trim()
    const admin = createAdminClient()

    const { count: recentClaims } = await admin
      .from("claim_requests")
      .select("id", { count: "exact", head: true })
      .ilike("claimant_email", claimantEmail.replace(/[\\%_]/g, (ch) => `\\${ch}`))
      .gte("created_at", hoursAgo(24))
    if ((recentClaims ?? 0) >= MAX_CLAIMS_PER_DAY) {
      return NextResponse.json(
        { success: false, message: "Too many claim requests. Please try again tomorrow." },
        { status: 429 },
      )
    }

    const supabase = createClient()

    const [artist, shop] = await Promise.all([
      artistSlug ? getArtistBySlug(artistSlug) : Promise.resolve(null),
      shopSlug ? getShopBySlug(shopSlug) : Promise.resolve(null),
    ])

    // "Where do you work?" (artist claims only); applied by approveClaim. Never an address.
    const workplaceFields =
      artist && isWorkplace(workplace)
        ? {
            workplace,
            workplace_shop_id: workplace === "shop" && typeof workplaceShopId === "string" && UUID.test(workplaceShopId) ? workplaceShopId : null,
          }
        : {}

    const { error: dbError } = await supabase.from("claim_requests").insert({
      ...workplaceFields,
      artist_id: artist?.id ?? null,
      shop_id: shop?.id ?? null,
      claimant_name: name.trim(),
      claimant_email: claimantEmail,
      claimant_phone: phone || null,
      instagram_handle: instagram || null,
      note: listing,
      status: "pending",
      created_at: new Date().toISOString(),
    })

    if (dbError) {
      return NextResponse.json({ success: false, message: dbError.message }, { status: 500 })
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
