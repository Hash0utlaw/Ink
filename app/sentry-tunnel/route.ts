import { POST as forwardToSentry } from "@sentry/nextjs/tunnel"

// Sentry tunnel: the browser sends error reports to /monitoring (rewritten here)
// so ad blockers don't drop them. Sentry's handler forwards only the event
// payload, and only for our own DSN. It would also pass on the visitor's IP
// (Sentry turns it into a city), so the IP headers are removed first.
const IP_HEADERS = ["x-forwarded-for", "x-vercel-forwarded-for", "x-real-ip", "cf-connecting-ip", "forwarded"]

export async function POST(request: Request) {
  const headers = new Headers(request.headers)
  for (const name of IP_HEADERS) headers.delete(name)
  return forwardToSentry(
    new Request(request.url, { method: "POST", headers, body: request.body, duplex: "half" } as RequestInit),
  )
}
