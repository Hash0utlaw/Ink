import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@/utils/supabase/server"
import { getArtistBySlug } from "@/lib/supabase/artists"
import { getShopBySlug } from "@/lib/supabase/shops"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { artistSlug, shopSlug, name, email, phone, instagram, listing } = await request.json()

    if (!name || !email || !listing) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    const supabase = createClient()

    const [artist, shop] = await Promise.all([
      artistSlug ? getArtistBySlug(artistSlug) : Promise.resolve(null),
      shopSlug ? getShopBySlug(shopSlug) : Promise.resolve(null),
    ])

    const { error: dbError } = await supabase.from("claim_requests").insert({
      artist_id: artist?.id ?? null,
      shop_id: shop?.id ?? null,
      claimant_name: name,
      claimant_email: email,
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
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "TattooMaps <bookings@tattoo-maps.com>"
    const notifyEmail = fromAddress.match(/<(.+)>/)?.[1] ?? fromAddress

    const emailPromises: Promise<unknown>[] = [
      resend.emails.send({
        from: fromAddress,
        to: notifyEmail,
        subject: `New claim request: ${listing}`,
        html: `<p>New profile claim submitted.</p>
               <p><strong>Listing:</strong> ${listing}</p>
               <p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
               ${instagram ? `<p><strong>Instagram:</strong> ${instagram}</p>` : ""}`,
      }),
      resend.emails.send({
        from: fromAddress,
        to: email,
        subject: "We received your claim request",
        html: `<p>Hi ${name},</p>
               <p>Thanks for claiming <strong>${listing}</strong> on TattooMaps. We'll verify and get back to you within 2 business days.</p>`,
      }),
    ]

    await Promise.allSettled(emailPromises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Claim error:", error)
    return NextResponse.json({ success: false, message: "Failed to submit claim" }, { status: 500 })
  }
}
