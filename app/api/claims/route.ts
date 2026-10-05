import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { getArtistBySlug } from "@/lib/supabase/artists"
import { getShopBySlug } from "@/lib/supabase/shops"
import { ADMIN_NOTIFY_EMAIL, FROM_EMAIL, REPLY_TO, SITE_URL } from "@/lib/site-config"
import { escapeHtml } from "@/lib/escape-html"
import { hoursAgo, isNonEmptyString, isValidEmail } from "@/lib/validation"

export const dynamic = "force-dynamic"

const MAX_CLAIMS_PER_DAY = 5

export async function POST(request: Request) {
  try {
    const { artistSlug, shopSlug, name, email, phone, instagram, listing } = await request.json()

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

    const { error: dbError } = await supabase.from("claim_requests").insert({
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

    const emailPromises: Promise<unknown>[] = [
      resend.emails.send({
        from: fromAddress,
        to: notifyEmail,
        subject: `New claim request: ${listing}`,
        html: `<p>New profile claim submitted.</p>
               <p><strong>Listing:</strong> ${escapeHtml(listing)}</p>
               <p><strong>Name:</strong> ${escapeHtml(name)}</p>
               <p><strong>Email:</strong> ${escapeHtml(claimantEmail)}</p>
               ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ""}
               ${instagram ? `<p><strong>Instagram:</strong> ${escapeHtml(instagram)}</p>` : ""}
               <p><a href="${SITE_URL}/admin/intros">Review pending claims →</a></p>`,
      }),
      resend.emails.send({
        from: fromAddress,
        to: claimantEmail,
        replyTo: REPLY_TO,
        subject: "We received your claim request",
        html: `<p>Hi ${escapeHtml(name)},</p>
               <p>Thanks for claiming <strong>${escapeHtml(listing)}</strong> on TattooMaps. We'll verify and get back to you within 2 business days.</p>`,
      }),
    ]

    await Promise.allSettled(emailPromises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Claim error:", error)
    return NextResponse.json({ success: false, message: "Failed to submit claim" }, { status: 500 })
  }
}
