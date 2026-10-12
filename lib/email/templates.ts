import { button, fields, link, list, note, p, quote, renderEmail, siteUrl, strong, subheading } from "@/lib/email/layout"
import type { RenderedEmail } from "@/lib/email/layout"

// Every transactional email's subject and content. Senders (the API routes,
// admin actions and cron) decide when and to whom; these only decide what it
// says. Pass raw values: the layout escapes everything.

export interface Email extends RenderedEmail {
  subject: string
}

type Maybe = string | null | undefined

const BECAUSE = {
  admin: "because this address is the TattooMaps admin inbox.",
  contact: "because you sent a message through the TattooMaps contact form.",
  client: "because you sent a booking request on TattooMaps.",
  artist: "because you have a TattooMaps artist account.",
  claimant: "because you asked to claim a listing on TattooMaps.",
}

// ─── Contact form ─────────────────────────────────────────────────────────────

export function contactAdminEmail(m: { name: string; email: string; reason: string; message: string }): Email {
  return {
    subject: `[Contact] ${m.reason} — ${m.name}`,
    ...renderEmail({
      heading: "New contact form message",
      blocks: [
        fields([
          ["Name", m.name],
          ["Email", m.email],
          ["Reason", m.reason],
        ]),
        quote(m.message),
      ],
      reason: BECAUSE.admin,
    }),
  }
}

export function contactReceiptEmail(m: { name: string }): Email {
  return {
    subject: "We received your message",
    ...renderEmail({
      heading: "We received your message",
      blocks: [p(`Hi ${m.name},`), p("Thanks for writing in. We read every message and will reply to this email address.")],
      reason: BECAUSE.contact,
    }),
  }
}

// ─── Booking requests ─────────────────────────────────────────────────────────

export interface RequestDetails {
  clientName: string
  clientEmail: string
  clientPhone?: Maybe
  preferredDate?: Maybe
  size?: Maybe
  placement?: Maybe
  style?: Maybe
  budget?: Maybe
  description?: Maybe
}

/** To the artist, when a client sends a request to a claimed profile. */
export function newRequestArtistEmail(r: RequestDetails): Email {
  return {
    subject: `New booking request from ${r.clientName}`,
    ...renderEmail({
      heading: "New booking request",
      blocks: [
        p("You have a new booking request from ", strong(r.clientName), "."),
        fields([
          ["Email", r.clientEmail],
          ["Phone", r.clientPhone],
          ["Preferred date", r.preferredDate],
          ["Description", r.description],
          ["Size", r.size],
          ["Placement", r.placement],
        ]),
      ],
      reason: BECAUSE.artist,
    }),
  }
}

/** To the client after sending a request. `nextStep` is the line from lib/request-copy.ts. */
export function requestReceiptEmail(
  m: { clientName: string; artistName: string } & (
    | { kind: "sent" }
    | { kind: "unclaimed"; nextStep: string }
    | { kind: "saved" }
  ),
): Email {
  const hi = p(`Hi ${m.clientName},`)
  if (m.kind === "sent") {
    return {
      subject: `Your request was sent to ${m.artistName}`,
      ...renderEmail({
        heading: "Your request was sent",
        blocks: [
          hi,
          p("Your booking request has been sent to ", strong(m.artistName), "."),
          p("They'll review it and get back to you."),
        ],
        reason: BECAUSE.client,
      }),
    }
  }
  const blocks = [hi, p("Thanks for your interest in ", strong(m.artistName), ". We've saved your request.")]
  if (m.kind === "unclaimed") blocks.push(p(`${m.artistName} hasn't claimed their TattooMaps page yet. ${m.nextStep}`))
  return {
    subject: `We received your request for ${m.artistName}`,
    ...renderEmail({ heading: "We received your request", blocks, reason: BECAUSE.client }),
  }
}

/** To the artist, when an admin marks an intro as claimed. */
export function claimedRequestArtistEmail(m: { artistName: string } & RequestDetails): Email {
  return {
    subject: `Booking request from ${m.clientName}`,
    ...renderEmail({
      heading: "A booking request for you",
      blocks: [
        p(`Hi ${m.artistName},`),
        p("Here's the booking request that was waiting for you on TattooMaps."),
        fields([
          ["Name", m.clientName],
          ["Email", m.clientEmail],
          ["Phone", m.clientPhone],
          ["Preferred date", m.preferredDate],
          ["Size", m.size],
          ["Placement", m.placement],
          ["Style", m.style],
          ["Budget", m.budget],
          ["Description", m.description],
        ]),
        button("Open your dashboard", siteUrl("/artist-dashboard")),
      ],
      reason: BECAUSE.artist,
    }),
  }
}

/** To the client, when an admin marks an intro as claimed. */
export function claimedRequestClientEmail(m: { clientName: string; artistName: string }): Email {
  return {
    subject: `${m.artistName} has claimed their profile and received your request`,
    ...renderEmail({
      heading: "Your request was delivered",
      blocks: [
        p(`Hi ${m.clientName},`),
        p(strong(m.artistName), " has claimed their profile and received your request. They'll reply to you directly."),
      ],
      reason: BECAUSE.client,
    }),
  }
}

export function bookingConfirmedEmail(m: {
  clientName: string
  artistName: string
  preferredDate?: Maybe
  description?: Maybe
}): Email {
  return {
    subject: `Your booking with ${m.artistName} is confirmed!`,
    ...renderEmail({
      heading: "Your booking is confirmed",
      blocks: [
        p(`Hi ${m.clientName},`),
        p(strong(m.artistName), " has confirmed your booking request."),
        fields([
          ["Date", m.preferredDate],
          ["Your idea", m.description],
        ]),
        p("The artist will be in touch with next steps."),
      ],
      reason: BECAUSE.client,
    }),
  }
}

export function bookingDeclinedEmail(m: { clientName: string; artistName: string }): Email {
  return {
    subject: "Update on your booking request",
    ...renderEmail({
      heading: "Update on your booking request",
      blocks: [
        p(`Hi ${m.clientName},`),
        p("Unfortunately, ", strong(m.artistName), " is unable to take your booking at this time."),
        p("We encourage you to browse other talented artists on TattooMaps."),
      ],
      reason: BECAUSE.client,
    }),
  }
}

export function reviewRequestEmail(m: { clientName: string; artistName: string; reviewUrl: string }): Email {
  return {
    subject: `How was your session with ${m.artistName}? Leave a review`,
    ...renderEmail({
      heading: "How was your session?",
      blocks: [
        p(`Hi ${m.clientName},`),
        p("Your session with ", strong(m.artistName), " has been marked complete. We'd love to hear how it went!"),
        button("Leave a review", m.reviewUrl),
        note("This link is unique to your booking and can only be used once."),
      ],
      reason: BECAUSE.client,
    }),
  }
}

export function newReviewArtistEmail(m: {
  artistName: string
  clientName: string
  rating: number
  reviewText?: Maybe
}): Email {
  const stars = "★".repeat(m.rating) + "☆".repeat(5 - m.rating)
  return {
    subject: `New ${m.rating}-star review from ${m.clientName}`,
    ...renderEmail({
      heading: "You have a new review",
      blocks: [
        p(`Hi ${m.artistName},`),
        p(`${m.clientName} left you a ${m.rating}-star review:`),
        p(stars),
        ...(m.reviewText ? [quote(m.reviewText)] : []),
        button("View your dashboard", siteUrl("/artist-dashboard")),
      ],
      reason: BECAUSE.artist,
    }),
  }
}

// ─── Claims ───────────────────────────────────────────────────────────────────

export function claimAdminEmail(m: {
  listing: string
  name: string
  email: string
  phone?: Maybe
  instagram?: Maybe
}): Email {
  return {
    subject: `New claim request: ${m.listing}`,
    ...renderEmail({
      heading: "New claim request",
      blocks: [
        fields([
          ["Listing", m.listing],
          ["Name", m.name],
          ["Email", m.email],
          ["Phone", m.phone],
          ["Instagram", m.instagram],
        ]),
        p(link("Review pending claims", siteUrl("/admin/intros"))),
      ],
      reason: BECAUSE.admin,
    }),
  }
}

export function claimReceiptEmail(m: { name: string; listing: string }): Email {
  return {
    subject: "We received your claim request",
    ...renderEmail({
      heading: "We received your claim request",
      blocks: [
        p(`Hi ${m.name},`),
        p("Thanks for claiming ", strong(m.listing), " on TattooMaps."),
        p("We check every claim by hand. We'll email you as soon as yours has been reviewed."),
      ],
      reason: BECAUSE.claimant,
    }),
  }
}

export function claimApprovedEmail(m: { name: string }): Email {
  return {
    subject: "Your TattooMaps claim is approved",
    ...renderEmail({
      heading: "Your claim is approved",
      blocks: [
        p(`Hi ${m.name},`),
        p("You're approved. Create your TattooMaps account with this email to manage your page."),
        button("Create your account", siteUrl("/signup")),
      ],
      reason: BECAUSE.claimant,
    }),
  }
}

// ─── Admin: intro requests ────────────────────────────────────────────────────

export interface IntroAlertContent {
  artistName: string
  subject: string
  request: { size: Maybe; placement: Maybe; style: Maybe; preferredDate: Maybe; description: Maybe; submitted: string }
  shop: { name: Maybe; address: Maybe }
  /** [label, href, text] */
  contacts: [string, string, string][]
  outreachMessage: string
}

export function introAlertEmail(m: IntroAlertContent): Email {
  return {
    subject: m.subject,
    ...renderEmail({
      heading: `New intro request for ${m.artistName}`,
      blocks: [
        fields([
          ["Size", m.request.size],
          ["Placement", m.request.placement],
          ["Style", m.request.style],
          ["Preferred date", m.request.preferredDate],
          ["Description", m.request.description],
          ["Submitted", m.request.submitted],
        ]),
        subheading("Shop"),
        fields([
          ["Name", m.shop.name],
          ["Address", m.shop.address],
        ]),
        m.contacts.length
          ? list(m.contacts.map(([label, href, text]) => [`${label}: `, link(text, href)]))
          : p("No contact details on file."),
        subheading("Outreach message"),
        quote(m.outreachMessage),
        p(link("Open the intros dashboard", siteUrl("/admin/intros"))),
      ],
      reason: BECAUSE.admin,
    }),
  }
}

export function introDigestEmail(m: {
  requests: { artistName: string; where: string; what: string; status: string }[]
  pendingClaims: number
}): Email {
  const n = m.requests.length
  const claims = `${m.pendingClaims} pending claim${m.pendingClaims === 1 ? "" : "s"}`
  return {
    subject: `Intro digest: ${n} waiting, ${claims}`,
    ...renderEmail({
      heading: "Intro digest",
      blocks: [
        p(strong(String(n)), ` request${n === 1 ? "" : "s"} need attention.`),
        ...(n
          ? [
              list(
                m.requests.map((r) => [
                  strong(r.artistName),
                  `${r.where ? ` at ${r.where}` : ""}${r.what ? `: ${r.what}` : ""} (${r.status})`,
                ]),
              ),
            ]
          : []),
        p(strong(String(m.pendingClaims)), ` pending claim${m.pendingClaims === 1 ? "" : "s"}.`),
        p(link("Open the intros dashboard", siteUrl("/admin/intros"))),
      ],
      reason: BECAUSE.admin,
    }),
  }
}
