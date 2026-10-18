// What we tell clients happens after they send a request. It mirrors
// app/api/bookings/route.ts: an artist with an account is emailed the request
// straight away; otherwise we contact their shop by hand (admin intros) and
// email the client if the artist claims their page and picks the request up
// (markClaimed in app/admin/intros/actions.ts). No response times: nothing
// in the flow guarantees one.

interface RequestCopyInput {
  /** Artist display name. */
  name: string
  /** The artist's shop, when known. */
  shopName?: string | null
  /** The artist has a TattooMaps account (artists.user_id), so the request is emailed to them. */
  hasAccount?: boolean
  /** No shop: we try to reach the artist through their Instagram. */
  hasInstagram?: boolean
}

/** The next step, said the same way before and after sending. */
export function requestNextStep({ name, shopName, hasAccount, hasInstagram }: RequestCopyInput): string {
  if (hasAccount) return `Your request goes straight to ${name}.`
  const shop = shopName?.trim()
  if (shop) return `We'll pass your request on to ${shop} and email you if ${name} picks it up.`
  // No shop to contact (Round 11): we reach the artist ourselves, usually on Instagram.
  return hasInstagram
    ? "We'll try to reach them through Instagram and pass your request on. If they reply, you'll hear from them directly."
    : "We'll try to reach them and pass your request on. If they reply, you'll hear from them directly."
}

/** Round 11, above the form for an artist with no shop and no account: "Kamil hasn't joined TattooMaps yet. …" */
export function noShopRequestIntro(firstName: string, hasInstagram: boolean): string {
  return `${firstName} hasn't joined TattooMaps yet. ${requestNextStep({ name: firstName, hasInstagram })}`
}

/** The line under a request form. */
export function requestFormNote(input: RequestCopyInput): string {
  return `Free to request, with no payment or commitment. ${requestNextStep(input)}`
}

/** The line under "Request sent". */
export function requestSentMessage(input: RequestCopyInput): string {
  return input.hasAccount ? `${input.name} has your request and will get back to you.` : requestNextStep(input)
}
