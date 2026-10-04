// scripts/lib/cleanup-utils.ts
// Shared helpers for the data-cleanup scripts (merge-duplicate-shops,
// flag-non-tattoo, clear-dead-websites, link-tattoodo-artists, undo).

import fs from "fs"
import path from "path"
import type { SupabaseClient } from "@supabase/supabase-js"

const PAGE_SIZE = 1000 // PostgREST caps every response at 1000 rows

// Pages through a whole table (ordered by id so pages are stable).
// `filter` lets callers add .eq()/.in() etc. to each page's query.
export async function fetchAll<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: (q: any) => any
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    let q = supabase.from(table).select(columns).order("id").range(from, from + PAGE_SIZE - 1)
    if (filter) q = filter(q)
    const { data, error } = await q
    if (error) throw new Error(`fetch ${table} failed: ${error.message}`)
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE_SIZE) break
  }
  return rows
}

// Fetches rows whose `column` is in `values`, chunked so the URL stays short.
export async function fetchIn<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  column: string,
  values: string[]
): Promise<T[]> {
  const rows: T[] = []
  for (let i = 0; i < values.length; i += 200) {
    const chunk = values.slice(i, i + 200)
    rows.push(...(await fetchAll<T>(supabase, table, columns, (q) => q.in(column, chunk))))
  }
  return rows
}

// Lowercase, alphanumeric only — "Ink & Iron Tattoo Co." → "inkirontattooco"
export function normalizeName(name: unknown): string {
  return String(name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

// Last 10 digits of a US phone number, or null if it isn't one.
export function normalizePhone(phone: unknown): string | null {
  let digits = String(phone ?? "").replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1)
  return digits.length === 10 ? digits : null
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

// 1 − levenshtein / longer length, on already-normalized strings. 1 = identical.
export function similarity(a: string, b: string): number {
  const longer = Math.max(a.length, b.length)
  if (longer === 0) return 1
  return 1 - levenshtein(a, b) / longer
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Usable coordinates, or null for missing / zeroed ones.
export function coords(row: Record<string, unknown>): [number, number] | null {
  const lat = Number(row.latitude)
  const lng = Number(row.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return null
  if (row.latitude == null || row.longitude == null) return null
  return [lat, lng]
}

// Null, blank string, empty array or empty object.
export function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === "string") return v.trim() === ""
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === "object") return Object.keys(v as object).length === 0
  return false
}

export function countFilled(row: Record<string, unknown>): number {
  return Object.values(row).filter((v) => !isEmptyValue(v)).length
}

// Grid index for "everything within ~N meters" lookups. Cell size is in
// degrees; callers pick it larger than their search radius.
export class GridIndex<T> {
  private cells = new Map<string, T[]>()
  constructor(private latStep: number, private lngStep: number) {}
  private key(lat: number, lng: number): [number, number] {
    return [Math.floor(lat / this.latStep), Math.floor(lng / this.lngStep)]
  }
  add(lat: number, lng: number, item: T): void {
    const [a, b] = this.key(lat, lng)
    const k = `${a}:${b}`
    const cell = this.cells.get(k)
    if (cell) cell.push(item)
    else this.cells.set(k, [item])
  }
  near(lat: number, lng: number): T[] {
    const [a, b] = this.key(lat, lng)
    const out: T[] = []
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++) out.push(...(this.cells.get(`${a + i}:${b + j}`) ?? []))
    return out
  }
}

export class UnionFind {
  private parent = new Map<string, string>()
  find(x: string): string {
    let p = this.parent.get(x) ?? x
    if (p !== x) {
      p = this.find(p)
      this.parent.set(x, p)
    }
    return p
  }
  union(a: string, b: string): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

// Runs fn over items with at most `limit` in flight.
export async function runPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await fn(items[next++])
  })
  await Promise.all(workers)
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function writeCsv(file: string, headers: string[], rows: Record<string, unknown>[]): string {
  const abs = path.resolve(file)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))]
  fs.writeFileSync(abs, lines.join("\n") + "\n")
  return abs
}

// Single-pass RFC 4180 CSV parser — handles quoted fields with embedded
// commas/newlines. Same parser as import-tattoodo-artists.ts.
export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = i + 1 < text.length ? text[i + 1] : ""

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++ }
      else if (ch === '"') { inQuotes = false }
      else { field += ch }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ",") { row.push(field); field = "" }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && next === "\n") i++
        row.push(field); field = ""
        if (row.some((f) => f.length > 0)) rows.push(row)
        row = []
      } else { field += ch }
    }
  }
  row.push(field)
  if (row.some((f) => f.length > 0)) rows.push(row)

  if (rows.length < 2) return []
  const headers = rows[0].map((h) => h.replace(/^﻿/, "").trim())
  return rows.slice(1).map((values) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = values[i] ?? "" })
    return obj
  })
}

export function modeBanner(apply: boolean): void {
  console.log(apply ? "APPLY MODE — changes will be written and undo-logged.\n" : "DRY RUN — nothing will be written. Pass --apply to write.\n")
}
