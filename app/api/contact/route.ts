import { NextResponse } from "next/server"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

const SUPPORT_EMAIL = "support@tattoomaps.com"

export async function POST(request: Request) {
  try {
    const { name, email, reason, message } = await request.json()

    if (!name || !email || !reason || !message) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "TattooMaps <bookings@tattoo-maps.com>"

    const emailPromises: Promise<unknown>[] = [
      resend.emails.send({
        from: fromAddress,
        to: SUPPORT_EMAIL,
        replyTo: email,
        subject: `[Contact] ${reason} — ${name}`,
        html: `<p>New contact form submission.</p>
               <p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Reason:</strong> ${reason}</p>
               <p><strong>Message:</strong></p>
               <p>${message.replace(/\n/g, "<br />")}</p>`,
      }),
      resend.emails.send({
        from: fromAddress,
        to: email,
        subject: "We received your message",
        html: `<p>Hi ${name},</p>
               <p>Thanks for reaching out about "${reason}". We'll reply to this email within 24 hours on business days.</p>`,
      }),
    ]

    await Promise.allSettled(emailPromises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json({ success: false, message: "Failed to send message" }, { status: 500 })
  }
}
