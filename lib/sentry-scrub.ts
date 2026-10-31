import type { Breadcrumb, ErrorEvent, NodeOptions } from "@sentry/nextjs"

type StreamedSpan = Parameters<NonNullable<NodeOptions["beforeSendSpan"]>>[0]

// Shared Sentry options and privacy filters for the client, server and edge
// configs. No PII reaches Sentry: request bodies, cookies and auth headers are
// dropped, and emails, phone numbers and tokens in any text are replaced.

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

/**
 * What the SDK may collect (Sentry v11's replacement for sendDefaultPii: false,
 * whose defaults collect almost everything). No user info, cookies, bodies,
 * query strings, database values or local variables; only harmless headers.
 */
export const DATA_COLLECTION: NonNullable<NodeOptions["dataCollection"]> = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: { allow: ["user-agent", "content-type", "accept"] }, response: false },
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  stackFrameVariables: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
  queues: false,
}

/** Errors 100%, performance traces 10% (free plan quota). */
export const SAMPLE_RATES = { sampleRate: 1, tracesSampleRate: 0.1 }

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
// US-style numbers: +1 (555) 123-4567, 555.123.4567, 5551234567.
const PHONE = /(?<![\w-])(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?![\w-])/g
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g
const BEARER = /\b(Bearer|Basic)\s+[\w.~+/=-]+/gi
// Secrets in URLs: review links (?token=), auth callbacks (?code=, #access_token=).
const URL_SECRET = /([?&#](?:access_token|refresh_token|token|code|key|apikey|secret|signature|password|token_hash)=)[^&#\s"']*/gi

export function scrubText(value: string): string {
  return value
    .replace(JWT, "[token]")
    .replace(BEARER, "$1 [token]")
    .replace(URL_SECRET, "$1[redacted]")
    .replace(EMAIL, "[email]")
    .replace(PHONE, "[phone]")
}

// Stack traces and SDK metadata hold file paths and line numbers, not user data.
const SKIP_KEYS = new Set(["stacktrace", "debug_meta", "sdk", "sdkProcessingMetadata"])

function scrubDeep<T>(value: T, depth = 0): T {
  if (typeof value === "string") return scrubText(value) as T
  if (depth > 8 || value === null || typeof value !== "object") return value
  if (Array.isArray(value)) return value.map((item) => scrubDeep(item, depth + 1)) as T
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    out[key] = SKIP_KEYS.has(key) ? item : scrubDeep(item, depth + 1)
  }
  return out as T
}

const SAFE_HEADERS = new Set(["user-agent", "content-type", "accept"])

export function beforeSend(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    // Never send request bodies (booking, claim, contact and review forms included),
    // cookies or auth headers.
    delete event.request.data
    delete event.request.cookies
    delete event.request.env
    if (event.request.headers) {
      event.request.headers = Object.fromEntries(
        Object.entries(event.request.headers).filter(([name]) => SAFE_HEADERS.has(name.toLowerCase())),
      )
    }
  }
  // No user identity (email, IP, username).
  delete event.user
  return scrubDeep(event)
}

// Performance spans (streamed in Sentry v11, so beforeSendTransaction never runs).
const PRIVATE_ATTRIBUTE = /^(user\.|client\.address|http\.request\.header\.(cookie|authorization))/

export function beforeSendSpan(span: StreamedSpan): StreamedSpan {
  const scrubbed = scrubDeep(span)
  for (const key of Object.keys(scrubbed.attributes ?? {})) {
    if (PRIVATE_ATTRIBUTE.test(key)) delete scrubbed.attributes[key]
  }
  return scrubbed
}

export function beforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  // Form fields typed by the visitor.
  if (breadcrumb.category === "ui.input") return null
  return scrubDeep(breadcrumb)
}
