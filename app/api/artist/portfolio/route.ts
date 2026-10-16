import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { PORTFOLIO_PUBLIC_PREFIX } from "@/lib/utils/safe-image"
import { isStyleSlug } from "@/lib/styles"
import { MAX_ACTIVE_PHOTOS, MAX_CAPTION } from "@/lib/portfolio-rules"

// The signed-in artist's portfolio (portfolio_images), managed from
// /artist-dashboard/portfolio. Photos are never deleted: removing one sets
// is_active = false, and undo sets it back. Files stay in storage.
//
// POST  { url, caption?, style? }  adds a photo already uploaded to
//       portfolio/{auth.uid()}/work/{uuid}.jpg, at the end of the order.
// PATCH { id, caption?, style?, display_order?, is_active? }
//       or { updates: [ ...those ] } to change several at once (reordering).

const FULL_MESSAGE = `You have ${MAX_ACTIVE_PHOTOS} photos, the most a portfolio can hold. Remove one to add another.`
const SELECT = "id, image_url, caption, style, display_order, is_active"

type Supabase = ReturnType<typeof createClient>

/** The caller's own claimed artist row, or an error response. */
async function ownArtist(supabase: Supabase): Promise<{ artistId: string; userId: string } | NextResponse> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in to manage your portfolio." }, { status: 401 })
  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_claimed", true)
    .maybeSingle()
  if (!artist) return NextResponse.json({ error: "Only the artist who claimed this page can change its portfolio." }, { status: 403 })
  return { artistId: (artist as { id: string }).id, userId: user.id }
}

async function activeCount(supabase: Supabase, artistId: string): Promise<number> {
  const { count } = await supabase
    .from("portfolio_images")
    .select("id", { count: "exact", head: true })
    .eq("artist_id", artistId)
    .eq("is_active", true)
  return count ?? 0
}

/** A caption: trimmed, at most 140 characters; empty means none. Undefined when not given; an Error when invalid. */
function parseCaption(value: unknown): string | null | undefined | Error {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== "string") return new Error("Caption must be text.")
  const caption = value.trim()
  if (caption.length > MAX_CAPTION) return new Error(`Keep the caption to ${MAX_CAPTION} characters or fewer.`)
  return caption || null
}

/** A style slug from lib/styles.ts, or null for none. */
function parseStyle(value: unknown): string | null | undefined | Error {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  return isStyleSlug(value) ? value : new Error("That isn't one of the styles on TattooMaps.")
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const own = await ownArtist(supabase)
    if (own instanceof NextResponse) return own
    const { artistId, userId } = own

    const body = (await req.json().catch(() => ({}))) as { url?: unknown; caption?: unknown; style?: unknown }
    const url = typeof body.url === "string" ? body.url : ""
    const folder = `${PORTFOLIO_PUBLIC_PREFIX}${userId}/work/`
    const file = url.slice(folder.length)
    if (!url.startsWith(folder) || !/^[\w-]+\.jpg$/.test(file)) {
      return NextResponse.json({ error: "That photo isn't in your upload folder." }, { status: 400 })
    }
    const caption = parseCaption(body.caption)
    if (caption instanceof Error) return NextResponse.json({ error: caption.message }, { status: 400 })
    const style = parseStyle(body.style)
    if (style instanceof Error) return NextResponse.json({ error: style.message }, { status: 400 })

    if ((await activeCount(supabase, artistId)) >= MAX_ACTIVE_PHOTOS) {
      return NextResponse.json({ error: FULL_MESSAGE }, { status: 409 })
    }

    // At the end of the order (hidden photos included, so undo never collides).
    const { data: last } = await supabase
      .from("portfolio_images")
      .select("display_order")
      .eq("artist_id", artistId)
      .order("display_order", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()
    const displayOrder = ((last as { display_order: number | null } | null)?.display_order ?? -1) + 1

    const { data, error } = await supabase
      .from("portfolio_images")
      .insert({
        artist_id: artistId,
        image_url: url,
        caption: caption ?? null,
        style: style ?? null,
        display_order: displayOrder,
        is_active: true,
      })
      .select(SELECT)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ photo: data }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

interface PhotoUpdate {
  id?: unknown
  caption?: unknown
  style?: unknown
  display_order?: unknown
  is_active?: unknown
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient()
    const own = await ownArtist(supabase)
    if (own instanceof NextResponse) return own
    const { artistId } = own

    const body = (await req.json().catch(() => ({}))) as PhotoUpdate & { updates?: unknown }
    const updates: PhotoUpdate[] = Array.isArray(body.updates) ? (body.updates as PhotoUpdate[]) : [body]
    if (updates.length === 0 || updates.length > MAX_ACTIVE_PHOTOS) {
      return NextResponse.json({ error: "Nothing to change." }, { status: 400 })
    }

    // Validate everything first, so a bad item changes nothing.
    const changes: { id: string; values: Record<string, unknown> }[] = []
    for (const u of updates) {
      if (typeof u.id !== "string" || !u.id) return NextResponse.json({ error: "Which photo?" }, { status: 400 })
      const values: Record<string, unknown> = {}
      const caption = parseCaption(u.caption)
      if (caption instanceof Error) return NextResponse.json({ error: caption.message }, { status: 400 })
      if (caption !== undefined) values.caption = caption
      const style = parseStyle(u.style)
      if (style instanceof Error) return NextResponse.json({ error: style.message }, { status: 400 })
      if (style !== undefined) values.style = style
      if (u.display_order !== undefined) {
        const order = Number(u.display_order)
        if (!Number.isInteger(order) || order < 0 || order > 10000) {
          return NextResponse.json({ error: "That position isn't valid." }, { status: 400 })
        }
        values.display_order = order
      }
      if (u.is_active !== undefined) {
        if (typeof u.is_active !== "boolean") return NextResponse.json({ error: "is_active must be true or false." }, { status: 400 })
        values.is_active = u.is_active
      }
      if (Object.keys(values).length === 0) return NextResponse.json({ error: "Nothing to change." }, { status: 400 })
      changes.push({ id: u.id, values })
    }

    // Every photo must be the caller's own.
    const ids = Array.from(new Set(changes.map((c) => c.id)))
    const { data: owned, error: ownedError } = await supabase
      .from("portfolio_images")
      .select("id, is_active")
      .eq("artist_id", artistId)
      .in("id", ids)
    if (ownedError) return NextResponse.json({ error: ownedError.message }, { status: 500 })
    const ownedById = new Map((owned ?? []).map((r: { id: string; is_active: boolean }) => [r.id, r]))
    if (ids.some((id) => !ownedById.has(id))) {
      return NextResponse.json({ error: "That photo isn't in your portfolio." }, { status: 404 })
    }

    // Bringing photos back (undo) can't go over the limit.
    const restoring = changes.filter((c) => c.values.is_active === true && !ownedById.get(c.id)?.is_active).length
    if (restoring > 0 && (await activeCount(supabase, artistId)) + restoring > MAX_ACTIVE_PHOTOS) {
      return NextResponse.json({ error: FULL_MESSAGE }, { status: 409 })
    }

    const now = new Date().toISOString()
    const saved = []
    for (const change of changes) {
      const { data, error } = await supabase
        .from("portfolio_images")
        .update({ ...change.values, updated_at: now })
        .eq("id", change.id)
        .eq("artist_id", artistId)
        .select(SELECT)
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      saved.push(data)
    }
    return NextResponse.json({ photos: saved })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
