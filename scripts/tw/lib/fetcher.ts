// scripts/tw/lib/fetcher.ts
// Polite, cached page fetcher shared by every TattoosWizard research stage.
//   - at most 3 requests in flight, paced to a target rate (default 1 req/s:
//     tattooswizard.com/robots.txt sets Crawl-delay: 1, so we never go faster)
//   - a slow response (> 3s) or any 5xx halves the rate for 60 seconds
//   - 429 / 403: pause 5 minutes, retry once, STOP if it repeats
//   - STOP after 10 errors in a row
//   - every raw page is cached by URL (gzipped); cached pages never hit the network
// A STOP throws StopError; callers save their checkpoint and exit.

import fs from "fs"
import path from "path"
import zlib from "zlib"

export const USER_AGENT = "TattooMaps research (support@tattoomaps.com)"
export const CACHE_DIR = path.resolve("data/cache/tattooswizard")

const MAX_IN_FLIGHT = 3
const SLOW_MS = 3000
const SLOWDOWN_MS = 60_000
const BLOCK_PAUSE_MS = 5 * 60_000
const MAX_CONSECUTIVE_ERRORS = 10
const TIMEOUT_MS = 30_000

export class StopError extends Error {}

export type FetchResult =
  | { ok: true; url: string; body: string; status: number; cached: boolean }
  | { ok: false; url: string; status: number; error: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// "https://tattooswizard.com/artists/foo.bar" → data/cache/tattooswizard/artists/foo.bar.html.gz
// Query strings become part of the file name ("?page=3" → "__page=3").
export function cachePath(url: string): string {
  const u = new URL(url)
  const query = u.search ? "__" + u.search.slice(1).replace(/[^a-zA-Z0-9=&._-]/g, "_") : ""
  let p = decodeURIComponent(u.pathname).replace(/^\/+/, "") || "index"
  p = p.replace(/[^a-zA-Z0-9/._-]/g, "_")
  return path.join(CACHE_DIR, u.hostname, `${p}${query}.gz`)
}

export function readCache(url: string): string | null {
  const file = cachePath(url)
  if (!fs.existsSync(file)) return null
  return zlib.gunzipSync(fs.readFileSync(file)).toString("utf-8")
}

function writeCache(url: string, body: string): void {
  const file = cachePath(url)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, zlib.gzipSync(body))
}

export class PoliteFetcher {
  private readonly baseIntervalMs: number
  private slowUntil = 0
  private nextStart = 0
  private inFlight = 0
  private waiters: (() => void)[] = []
  private consecutiveErrors = 0
  private pausedUntil = 0
  private blockRetried = false

  // Network stats for progress lines.
  requests = 0
  errors = 0
  slowdowns = 0

  constructor(rps = 1) {
    this.baseIntervalMs = 1000 / rps
  }

  get currentRps(): number {
    return (Date.now() < this.slowUntil ? 0.5 : 1) * (1000 / this.baseIntervalMs)
  }

  private async acquire(): Promise<void> {
    while (this.inFlight >= MAX_IN_FLIGHT) await new Promise<void>((r) => this.waiters.push(r))
    this.inFlight++
    // Pacing: each request start is spaced by the current interval.
    for (;;) {
      const now = Date.now()
      if (now < this.pausedUntil) {
        await sleep(this.pausedUntil - now)
        continue
      }
      const interval = now < this.slowUntil ? this.baseIntervalMs * 2 : this.baseIntervalMs
      const start = Math.max(now, this.nextStart)
      this.nextStart = start + interval
      if (start > now) await sleep(start - now)
      return
    }
  }

  private release(): void {
    this.inFlight--
    this.waiters.shift()?.()
  }

  private slowDown(reason: string): void {
    if (Date.now() >= this.slowUntil) {
      this.slowdowns++
      console.log(`  ⚠ ${reason} — halving the rate for 60s`)
    }
    this.slowUntil = Date.now() + SLOWDOWN_MS
  }

  private noteError(): void {
    this.errors++
    this.consecutiveErrors++
    if (this.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      throw new StopError(`${MAX_CONSECUTIVE_ERRORS} errors in a row`)
    }
  }

  /** Cached GET. Cached pages never touch the network. */
  async get(url: string, opts: { refresh?: boolean } = {}): Promise<FetchResult> {
    if (!opts.refresh) {
      const cached = readCache(url)
      if (cached !== null) return { ok: true, url, body: cached, status: 200, cached: true }
    }
    for (let attempt = 0; ; attempt++) {
      await this.acquire()
      let status = 0
      let body = ""
      let error = ""
      const t0 = Date.now()
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": USER_AGENT, "Accept-Encoding": "gzip", Accept: "text/html,application/xml;q=0.9,*/*;q=0.8" },
          redirect: "follow",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        status = res.status
        body = await res.text()
      } catch (e) {
        error = e instanceof Error ? e.message : String(e)
      } finally {
        this.requests++
        this.release()
      }
      const elapsed = Date.now() - t0

      if (status === 429 || status === 403) {
        if (this.blockRetried) throw new StopError(`HTTP ${status} again after the 5-minute pause (${url})`)
        this.blockRetried = true
        this.errors++
        console.log(`  ⛔ HTTP ${status} on ${url} — pausing 5 minutes, then retrying once`)
        this.pausedUntil = Date.now() + BLOCK_PAUSE_MS
        continue
      }
      if (status >= 200 && status < 300) {
        if (elapsed > SLOW_MS) this.slowDown(`slow response (${(elapsed / 1000).toFixed(1)}s)`)
        this.consecutiveErrors = 0
        this.blockRetried = false
        writeCache(url, body)
        return { ok: true, url, body, status, cached: false }
      }
      if (status >= 500) this.slowDown(`HTTP ${status}`)
      else if (!status && elapsed > SLOW_MS) this.slowDown(`timeout/network error after ${(elapsed / 1000).toFixed(1)}s`)
      console.log(`  ✗ ${status ? `HTTP ${status}` : error} after ${(elapsed / 1000).toFixed(1)}s — ${url}`)
      this.noteError()
      // 5xx / network errors get two retries with backoff; 4xx (e.g. 404) are final.
      if ((status >= 500 || !status) && attempt < 2) {
        await sleep(5000 * (attempt + 1))
        continue
      }
      return { ok: false, url, status, error: error || `HTTP ${status}` }
    }
  }
}

/** Prints "done/total, rate, errors, time left" every `every` items. */
export class Progress {
  private readonly t0 = Date.now()
  done = 0
  failed = 0
  constructor(private readonly total: number, private readonly fetcher: PoliteFetcher, private readonly every = 100) {}
  tick(ok: boolean): void {
    this.done++
    if (!ok) this.failed++
    if (this.done % this.every === 0 || this.done === this.total) this.print()
  }
  print(): void {
    const secs = (Date.now() - this.t0) / 1000
    const rate = this.done / Math.max(secs, 1)
    const left = (this.total - this.done) / Math.max(rate, 0.01)
    console.log(
      `  ${this.done}/${this.total} · ${rate.toFixed(2)} pages/s (${this.fetcher.requests} network, ` +
        `now ${this.fetcher.currentRps.toFixed(2)} req/s) · ${this.failed} failed / ${this.fetcher.errors} errors · ` +
        `~${fmtDuration(left)} left`
    )
  }
}

export function fmtDuration(secs: number): string {
  if (!Number.isFinite(secs)) return "?"
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  return h ? `${h}h${String(m).padStart(2, "0")}m` : m ? `${m}m${String(s).padStart(2, "0")}s` : `${s}s`
}

/** Runs fn over items with at most `limit` running; a StopError aborts the rest. */
export async function runQueue<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  let stop: unknown = null
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length && !stop) {
      try {
        await fn(items[next++])
      } catch (e) {
        stop = e
      }
    }
  })
  await Promise.all(workers)
  if (stop) throw stop
}
