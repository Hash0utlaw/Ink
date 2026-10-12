import { NextResponse } from "next/server"
import { Resend } from "resend"
import { ADMIN_NOTIFY_EMAIL, FROM_EMAIL, REPLY_TO, SUPPORT_EMAIL } from "@/lib/site-config"
import { contactAdminEmail, contactReceiptEmail } from "@/lib/email/templates"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { name, email, reason, message } = await request.json()

    if (!name || !email || !reason || !message) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromAddress = FROM_EMAIL

    const toAdmin = contactAdminEmail({ name, email, reason, message })
    const toSender = contactReceiptEmail({ name })

    const emailPromises: Promise<unknown>[] = [
      resend.emails.send({
        from: fromAddress,
        to: ADMIN_NOTIFY_EMAIL ?? SUPPORT_EMAIL,
        replyTo: email,
        subject: toAdmin.subject,
        html: toAdmin.html,
        text: toAdmin.text,
      }),
      resend.emails.send({
        from: fromAddress,
        to: email,
        replyTo: REPLY_TO,
        subject: toSender.subject,
        html: toSender.html,
        text: toSender.text,
      }),
    ]

    await Promise.allSettled(emailPromises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json({ success: false, message: "Failed to send message" }, { status: 500 })
  }
}
