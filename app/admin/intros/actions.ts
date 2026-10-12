"use server"

import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { isAdmin } from "@/lib/admin"
import { FROM_EMAIL, REPLY_TO } from "@/lib/site-config"
import { claimApprovedEmail, claimedRequestArtistEmail, claimedRequestClientEmail } from "@/lib/email/templates"

export type ActionResult = { ok: true; message: string } | { ok: false; error: string }

async function requireAdmin(): Promise<boolean> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return isAdmin(user?.email)
}

const NOT_ALLOWED: ActionResult = { ok: false, error: "Not allowed" }

async function setOutreachStatus(bookingId: string, status: "contacted" | "closed"): Promise<ActionResult> {
  if (!(await requireAdmin())) return NOT_ALLOWED
  const admin = createAdminClient()
  const updates: Record<string, string> = { outreach_status: status }
  if (status === "contacted") updates.outreach_contacted_at = new Date().toISOString()
  const { error } = await admin.from("booking_requests").update(updates).eq("id", bookingId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/intros")
  return { ok: true, message: status === "contacted" ? "Marked contacted" : "Marked closed" }
}

export async function markContacted(bookingId: string) {
  return setOutreachStatus(bookingId, "contacted")
}

export async function markClosed(bookingId: string) {
  return setOutreachStatus(bookingId, "closed")
}

export async function markClaimed(bookingId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return NOT_ALLOWED
  const admin = createAdminClient()

  const { data: booking, error: bookingError } = await admin
    .from("booking_requests")
    .select(
      "id, client_name, client_email, client_phone, preferred_date, description, size, placement, style, budget, artists(display_name, user_id)",
    )
    .eq("id", bookingId)
    .maybeSingle()
  if (bookingError || !booking) return { ok: false, error: bookingError?.message ?? "Request not found" }

  const b = booking as unknown as {
    client_name: string
    client_email: string
    client_phone: string | null
    preferred_date: string | null
    description: string | null
    size: string | null
    placement: string | null
    style: string | null
    budget: string | null
    artists: { display_name: string | null; user_id: string | null } | null
  }

  const notLinked: ActionResult = { ok: false, error: "This artist hasn't linked an account yet" }
  const artistUserId = b.artists?.user_id
  if (!artistUserId) return notLinked

  const { data: profile } = await admin.from("user_profiles").select("email").eq("id", artistUserId).maybeSingle()
  const artistEmail = (profile as { email?: string | null } | null)?.email
  if (!artistEmail) return notLinked

  const artistName = b.artists?.display_name || "Your artist"
  const toArtist = claimedRequestArtistEmail({
    artistName,
    clientName: b.client_name,
    clientEmail: b.client_email,
    clientPhone: b.client_phone,
    preferredDate: b.preferred_date,
    size: b.size,
    placement: b.placement,
    style: b.style,
    budget: b.budget,
    description: b.description,
  })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: artistEmailError } = await resend.emails.send({
    from: FROM_EMAIL,
    to: artistEmail,
    replyTo: REPLY_TO,
    subject: toArtist.subject,
    html: toArtist.html,
    text: toArtist.text,
  })
  if (artistEmailError) return { ok: false, error: `Artist email failed: ${artistEmailError.message}` }

  const toClient = claimedRequestClientEmail({ clientName: b.client_name, artistName })
  const { error: clientEmailError } = await resend.emails.send({
    from: FROM_EMAIL,
    to: b.client_email,
    replyTo: REPLY_TO,
    subject: toClient.subject,
    html: toClient.html,
    text: toClient.text,
  })
  if (clientEmailError) console.error("[admin/intros] client email failed:", clientEmailError.message)

  const { error } = await admin.from("booking_requests").update({ outreach_status: "claimed" }).eq("id", bookingId)
  if (error) return { ok: false, error: error.message }

  revalidatePath("/admin/intros")
  return { ok: true, message: "Marked claimed — request sent to the artist" }
}

export async function approveClaim(claimId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return NOT_ALLOWED
  const admin = createAdminClient()

  const { data: claim, error: claimError } = await admin
    .from("claim_requests")
    .select("id, artist_id, shop_id, claimant_name, claimant_email, status")
    .eq("id", claimId)
    .maybeSingle()
  if (claimError || !claim) return { ok: false, error: claimError?.message ?? "Claim not found" }

  const c = claim as {
    artist_id: string | null
    shop_id: string | null
    claimant_name: string
    claimant_email: string
    status: string
  }
  if (c.status !== "pending") return { ok: false, error: `Claim is already ${c.status}` }
  if (!c.artist_id && !c.shop_id) return { ok: false, error: "This claim isn't linked to an artist or shop" }

  // The claimant's email goes in claim_links (RLS on, no public policies —
  // service role only), never on the public artists/shops rows. Login and
  // /auth/confirm link the listing when that email signs in (lib/link-claims.ts).
  // A row for this claim may already exist if an earlier approve failed after the insert.
  const { data: existingLink, error: existingError } = await admin
    .from("claim_links")
    .select("id")
    .eq("claim_request_id", claimId)
    .maybeSingle()
  if (existingError) return { ok: false, error: existingError.message }
  if (!existingLink) {
    const { error: linkError } = await admin.from("claim_links").insert({
      email: c.claimant_email.trim().toLowerCase(),
      artist_id: c.artist_id ?? null,
      shop_id: c.artist_id ? null : c.shop_id,
      claim_request_id: claimId,
    })
    if (linkError) return { ok: false, error: linkError.message }
  }

  const { error } = await admin
    .from("claim_requests")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", claimId)
  if (error) return { ok: false, error: error.message }

  const approved = claimApprovedEmail({ name: c.claimant_name })
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: emailError } = await resend.emails.send({
    from: FROM_EMAIL,
    to: c.claimant_email,
    replyTo: REPLY_TO,
    subject: approved.subject,
    html: approved.html,
    text: approved.text,
  })

  revalidatePath("/admin/intros")
  if (emailError) return { ok: false, error: `Approved, but the email failed: ${emailError.message}` }
  return { ok: true, message: "Claim approved" }
}

export async function rejectClaim(claimId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return NOT_ALLOWED
  const admin = createAdminClient()
  const { error } = await admin
    .from("claim_requests")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", claimId)
    .eq("status", "pending")
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/intros")
  return { ok: true, message: "Claim rejected" }
}
