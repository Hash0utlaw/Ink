// Sentry in the browser. Injected into the client bundle by withSentryConfig.
// Does nothing without NEXT_PUBLIC_SENTRY_DSN. No session replay.
import * as Sentry from "@sentry/nextjs"
import { DATA_COLLECTION, SAMPLE_RATES, SENTRY_DSN, beforeBreadcrumb, beforeSend, beforeSendSpan } from "@/lib/sentry-scrub"

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    dataCollection: DATA_COLLECTION,
    ...SAMPLE_RATES,
    beforeSend,
    beforeSendSpan,
    beforeBreadcrumb,
  })
}
