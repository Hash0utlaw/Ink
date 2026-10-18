// scripts/ig/targets.ts
// The rows Step 5 looks up: active artists with an instagram_handle and active
// shops with an instagram_url, each reduced to a bare username.

import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchAll } from "../lib/cleanup-utils"
import { withRetry } from "../lib/retry"
import { igUsername } from "./lib"

export type Kind = "artists" | "shops"

export interface Target {
  table: Kind
  id: string
  name: string
  city: string | null
  state: string | null
  raw: string
  username: string | null
  followers: number | null
  checked_at: string | null
}

export async function loadTargets(supabase: SupabaseClient): Promise<Target[]> {
  const artists = await withRetry("fetch artists", () =>
    fetchAll<Record<string, unknown>>(supabase, "artists", "id, display_name, city, state, instagram_handle, instagram_followers, instagram_checked_at", (q) =>
      q.eq("is_active", true).not("instagram_handle", "is", null),
    ),
  )
  const shops = await withRetry("fetch shops", () =>
    fetchAll<Record<string, unknown>>(supabase, "shops", "id, name, city, state, instagram_url, instagram_followers, instagram_checked_at", (q) =>
      q.eq("is_active", true).not("instagram_url", "is", null),
    ),
  )
  const row = (table: Kind, r: Record<string, unknown>, name: unknown, raw: unknown): Target => ({
    table,
    id: String(r.id),
    name: String(name ?? ""),
    city: (r.city as string) ?? null,
    state: (r.state as string) ?? null,
    raw: String(raw ?? ""),
    username: igUsername(raw),
    followers: (r.instagram_followers as number | null) ?? null,
    checked_at: (r.instagram_checked_at as string | null) ?? null,
  })
  return [
    ...artists.map((r) => row("artists", r, r.display_name, r.instagram_handle)),
    ...shops.map((r) => row("shops", r, r.name, r.instagram_url)),
  ].filter((t) => t.raw.trim())
}

/** Unique usernames, those with any row lacking a follower count first. */
export function orderedUsernames(targets: Target[]): string[] {
  const missing = new Map<string, boolean>()
  for (const t of targets) {
    if (!t.username) continue
    missing.set(t.username, (missing.get(t.username) ?? false) || t.followers === null)
  }
  const all = Array.from(missing.keys())
  return [...all.filter((u) => missing.get(u)), ...all.filter((u) => !missing.get(u))]
}
