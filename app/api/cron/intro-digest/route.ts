import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createAdminClient } from "@/utils/supabase/admin"
import { ADMIN_NOTIFY_EMAIL, FROM_EMAIL } from "@/lib/site-config"
import { introDigestEmail } from "@/lib/email/templates"
import { hoursAgo } from "@/lib/validation"
import { hoursSince, introShop, type IntroArtist } from "@/lib/intro-outreach"

export const dynamic = "force-dynamic"

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const given = Buffer.from(request.headers.get("authorization") ?? "")
  const expected = Buffer.from(`Bearer ${secret}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

interface DigestRow {
  id: string
  created_at: string
  outreach_status: "new" | "contacted"
  outreach_contacted_at: string | null
  size: string | null
  placement: string | null
  artists: IntroArtist | null
}

// Daily digest (Vercel Cron, 13:00 UTC): requests still 'new', requests
// 'contacted' more than 48h ago, and the count of pending claims.
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const cutoff = hoursAgo(48)

  const [{ data: rows, error }, { count: pendingClaims, error: claimError }] = await Promise.all([
    admin
      .from("booking_requests")
      .select(
        "id, created_at, outreach_status, outreach_contacted_at, size, placement, artists(id, display_name, handle, shops(name, city, state))",
      )
      .or(`outreach_status.eq.new,and(outreach_status.eq.contacted,outreach_contacted_at.lt.${cutoff})`)
      .order("created_at", { ascending: true }),
    admin.from("claim_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ])

  if (error || claimError) {
    return NextResponse.json({ error: error?.message ?? claimError?.message }, { status: 500 })
  }

  const requests = (rows ?? []) as unknown as DigestRow[]
  const claimCount = pendingClaims ?? 0

  if (requests.length === 0 && claimCount === 0) {
    return NextResponse.json({ sent: false, requests: 0, pendingClaims: 0 })
  }
  if (!ADMIN_NOTIFY_EMAIL) {
    return NextResponse.json({ error: "ADMIN_NOTIFY_EMAIL is not set" }, { status: 500 })
  }

  const now = Date.now()
  const digest = introDigestEmail({
    requests: requests.map((r) => {
      const shop = r.artists ? introShop(r.artists) : null
      return {
        artistName: r.artists?.display_name ?? "Unknown artist",
        where: [shop?.name, [shop?.city, shop?.state].filter(Boolean).join(" ")].filter(Boolean).join(", "),
        what: [r.size, r.placement].filter(Boolean).join(", "),
        status:
          r.outreach_status === "new"
            ? `new, ${hoursSince(r.created_at, now)}h old`
            : `contacted ${hoursSince(r.outreach_contacted_at ?? r.created_at, now)}h ago`,
      }
    }),
    pendingClaims: claimCount,
  })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error: sendError } = await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_NOTIFY_EMAIL,
    subject: digest.subject,
    html: digest.html,
    text: digest.text,
  })
  if (sendError) {
    return NextResponse.json({ error: sendError.message }, { status: 502 })
  }

  return NextResponse.json({ sent: true, id: data?.id, requests: requests.length, pendingClaims: claimCount })
}
