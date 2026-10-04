// scripts/lib/retry.ts
// Retries a database call that throws on failure: the first try plus up to 3
// retries, waiting 2s, 5s, then 10s. Each retry is logged; the last error is
// rethrown only if every attempt fails.
// supabase-js returns { error } instead of throwing, so callers wrap the call
// in a function that throws when error is set.

const BACKOFF_MS = [2000, 5000, 10000]
const ATTEMPTS = BACKOFF_MS.length + 1

export async function withRetry<T>(label: string, fn: (attempt: number) => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      return await fn(attempt)
    } catch (e) {
      lastError = e
      if (attempt === ATTEMPTS) break
      const wait = BACKOFF_MS[attempt - 1]
      console.warn(`    retry ${attempt}/${ATTEMPTS - 1} in ${wait / 1000}s — ${label}: ${(e as Error).message}`)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw lastError
}
