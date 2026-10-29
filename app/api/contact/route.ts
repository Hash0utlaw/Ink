import { NextResponse } from "next/server"
import { Resend } from "resend"
import { ADMIN_NOTIFY_EMAIL, FROM_EMAIL, SUPPORT_EMAIL } from "@/lib/site-config"
import { contactAdminEmail } from "@/lib/email/templates"
import { MAX, isBot, isValidEmail, requiredText } from "@/lib/validation"
import { RATE_LIMIT_MESSAGE, allowRequest } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

// Only notifies the admin inbox. No receipt goes to the typed-in address, so
// the form can't be used to send mail to strangers.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (isBot(body)) return NextResponse.json({ success: true })

    const name = requiredText(body.name, MAX.name)
    const reason = requiredText(body.reason, MAX.short)
    const message = requiredText(body.message, MAX.message)
    if (!name || !reason || !message || !isValidEmail(body.email)) {
      return NextResponse.json(
        {
          success: false,
          message: `Please give your name, a valid email, a reason and a message of up to ${MAX.message.toLocaleString()} characters.`,
        },
        { status: 400 },
      )
    }
    const email = body.email.trim()

    if (!(await allowRequest(request, "contact", email))) {
      return NextResponse.json({ success: false, message: RATE_LIMIT_MESSAGE }, { status: 429 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const toAdmin = contactAdminEmail({ name, email, reason, message })
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_NOTIFY_EMAIL ?? SUPPORT_EMAIL,
      replyTo: email,
      subject: toAdmin.subject,
      html: toAdmin.html,
      text: toAdmin.text,
    })
    if (error) console.error("Contact form email failed:", error.message)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json({ success: false, message: "Failed to send message" }, { status: 500 })
  }
}
