"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowDown, ArrowUp } from "lucide-react"
import { getClient } from "@/utils/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { STYLES } from "@/lib/styles"
import { MAX_ACTIVE_PHOTOS, MAX_CAPTION } from "@/lib/portfolio-rules"
import { PhotoError, isImageFile, preparePhoto } from "@/lib/prepare-photo"
import { cn } from "@/lib/utils"

export interface ManagedPhoto {
  id: string
  url: string
  caption: string
  style: string
}

interface Upload {
  key: string
  name: string
  /** 0 to 100. */
  progress: number
  status: "waiting" | "preparing" | "uploading" | "saving" | "done" | "error"
  error?: string
}

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string }

const PRIMARY =
  "inline-flex min-h-12 items-center justify-center rounded border-1.5 border-ink bg-flash-red px-6 text-base font-semibold text-white hover:bg-flash-red/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
const FIELD =
  "min-h-11 w-full rounded border-1.5 border-ink bg-white px-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const ICON_BUTTON =
  "inline-flex h-11 w-11 items-center justify-center rounded border-1.5 border-ink bg-vellum tex-vellum text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
const TEXT_BUTTON =
  "inline-flex min-h-11 items-center px-1 text-sm font-semibold text-navy underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

const STATUS_TEXT: Record<Upload["status"], string> = {
  waiting: "Waiting",
  preparing: "Getting it ready",
  uploading: "Uploading",
  saving: "Saving",
  done: "Added",
  error: "Not added",
}

/** PUT a blob into the portfolio bucket with upload progress (supabase-js has no progress events). */
function uploadWithProgress(path: string, blob: Blob, token: string, onProgress: (pct: number) => void): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${base}/storage/v1/object/portfolio/${path}`)
    xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    xhr.setRequestHeader("apikey", anon)
    xhr.setRequestHeader("Content-Type", "image/jpeg")
    xhr.setRequestHeader("cache-control", "max-age=31536000")
    xhr.setRequestHeader("x-upsert", "false")
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      let message = "The upload didn't work. Try again."
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string; error?: string }
        if (/size|large/i.test(body.message ?? body.error ?? "")) message = "This photo is over the 5 MB limit."
      } catch {
        // Keep the plain message.
      }
      reject(new Error(message))
    }
    xhr.onerror = () => reject(new Error("The upload didn't go through. Check your connection and try again."))
    xhr.send(blob)
  })
}

async function patchPhotos(updates: Record<string, unknown>[]): Promise<void> {
  const res = await fetch("/api/artist/portfolio", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates }),
  })
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(json.error ?? "Couldn't save that change. Try again.")
  }
}

interface PortfolioManagerProps {
  userId: string
  artistName: string
  publicHref: string
  initialPhotos: ManagedPhoto[]
}

/**
 * The artist's portfolio manager (Round 10 dashboard boards): a drop zone and
 * "Choose photos", per-file progress, then one tile per photo with caption,
 * style, move earlier/later and Remove (with Undo). Every change saves on its own.
 */
export function PortfolioManager({ userId, artistName, publicHref, initialPhotos }: PortfolioManagerProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<ManagedPhoto[]>(initialPhotos)
  const photosRef = useRef(photos)
  photosRef.current = photos
  const [uploads, setUploads] = useState<Upload[]>([])
  const [dragging, setDragging] = useState(false)
  const [save, setSave] = useState<SaveState>({ kind: "idle" })
  const pending = useRef(0)
  const captionTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const moveButtons = useRef(new Map<string, HTMLButtonElement | null>())
  const [focusAfterMove, setFocusAfterMove] = useState<string | null>(null)
  const queue = useRef<Promise<void>>(Promise.resolve())

  // Saves one batch of changes, showing "Saving" then "Saved" (or the error).
  const persist = useCallback(async (updates: Record<string, unknown>[]) => {
    pending.current += 1
    setSave({ kind: "saving" })
    try {
      await patchPhotos(updates)
      pending.current -= 1
      if (pending.current === 0) setSave({ kind: "saved" })
      return true
    } catch (e) {
      pending.current -= 1
      setSave({ kind: "error", message: (e as Error).message })
      return false
    }
  }, [])

  // Captions still waiting on their debounce go out when the artist leaves the page or tab.
  useEffect(() => {
    const timers = captionTimers.current
    const flush = () => {
      if (timers.size === 0) return
      const updates = Array.from(timers.keys()).map((id) => ({
        id,
        caption: photosRef.current.find((p) => p.id === id)?.caption ?? "",
      }))
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
      void fetch("/api/artist/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
        keepalive: true,
      })
    }
    window.addEventListener("pagehide", flush)
    return () => {
      window.removeEventListener("pagehide", flush)
      flush()
    }
  }, [])

  useEffect(() => {
    if (!focusAfterMove) return
    const [id, dir] = focusAfterMove.split(":")
    const same = moveButtons.current.get(`${id}:${dir}`)
    const other = moveButtons.current.get(`${id}:${dir === "up" ? "down" : "up"}`)
    ;(same && !same.disabled ? same : other)?.focus()
    setFocusAfterMove(null)
  }, [focusAfterMove, photos])

  /** Sends display_order for every photo whose position changed. */
  function saveOrder(next: ManagedPhoto[], before: ManagedPhoto[]) {
    const updates = next
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => before[i]?.id !== p.id)
      .map(({ p, i }) => ({ id: p.id, display_order: i }))
    if (updates.length > 0) void persist(updates)
  }

  function move(index: number, dir: "up" | "down") {
    const target = dir === "up" ? index - 1 : index + 1
    const before = photosRef.current
    if (target < 0 || target >= before.length) return
    const next = [...before]
    ;[next[index], next[target]] = [next[target], next[index]]
    setPhotos(next)
    setFocusAfterMove(`${next[target].id}:${dir}`)
    saveOrder(next, before)
  }

  function setCaption(id: string, caption: string) {
    setPhotos((list) => list.map((p) => (p.id === id ? { ...p, caption } : p)))
    const timers = captionTimers.current
    clearTimeout(timers.get(id))
    setSave({ kind: "saving" })
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id)
        void persist([{ id, caption }])
      }, 700),
    )
  }

  function setStyle(id: string, style: string) {
    setPhotos((list) => list.map((p) => (p.id === id ? { ...p, style } : p)))
    void persist([{ id, style: style || null }])
  }

  async function undoRemove(photo: ManagedPhoto, index: number) {
    const ok = await persist([{ id: photo.id, is_active: true }])
    if (!ok) return
    const before = photosRef.current
    const next = [...before]
    next.splice(Math.min(index, next.length), 0, photo)
    setPhotos(next)
    // Its old position may now be taken: renumber from where it went back in.
    void persist(next.map((p, i) => ({ id: p.id, display_order: i })).slice(index))
  }

  async function remove(index: number) {
    const photo = photosRef.current[index]
    if (!photo) return
    // A caption still waiting to save goes with the removal, so Undo brings it back too.
    const captionPending = captionTimers.current.has(photo.id)
    clearTimeout(captionTimers.current.get(photo.id))
    captionTimers.current.delete(photo.id)
    const ok = await persist([{ id: photo.id, is_active: false, ...(captionPending ? { caption: photo.caption } : {}) }])
    if (!ok) return
    setPhotos((list) => list.filter((p) => p.id !== photo.id))
    toast({
      title: "Photo removed",
      description: photo.caption ? `"${photo.caption}" is off your page.` : "It's off your page.",
      action: (
        <ToastAction
          altText="Undo removing the photo"
          onClick={() => void undoRemove(photo, index)}
          className="min-h-11 rounded border-1.5 border-ink bg-vellum px-4 font-semibold text-ink"
        >
          Undo
        </ToastAction>
      ),
    })
  }

  function updateUpload(key: string, patch: Partial<Upload>) {
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...patch } : u)))
  }

  async function uploadOne(file: File, key: string) {
    const supabase = getClient()
    const session = supabase ? (await supabase.auth.getSession()).data.session : null
    if (!session) return updateUpload(key, { status: "error", error: "Sign in again to upload." })
    if (photosRef.current.length >= MAX_ACTIVE_PHOTOS) {
      return updateUpload(key, {
        status: "error",
        error: `Your portfolio has ${MAX_ACTIVE_PHOTOS} photos, the most it can hold. Remove one to add another.`,
      })
    }
    try {
      updateUpload(key, { status: "preparing", progress: 0 })
      const jpeg = await preparePhoto(file)
      updateUpload(key, { status: "uploading" })
      const path = `${userId}/work/${crypto.randomUUID()}.jpg`
      await uploadWithProgress(path, jpeg, session.access_token, (progress) => updateUpload(key, { progress }))
      updateUpload(key, { status: "saving", progress: 100 })
      const url = supabase!.storage.from("portfolio").getPublicUrl(path).data.publicUrl
      const res = await fetch("/api/artist/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        error?: string
        photo?: { id: string; image_url: string; caption: string | null; style: string | null }
      }
      if (!res.ok || !json.photo) throw new Error(json.error ?? "The photo uploaded but didn't save. Try again.")
      const photo = json.photo
      setPhotos((list) => [...list, { id: photo.id, url: photo.image_url, caption: photo.caption ?? "", style: photo.style ?? "" }])
      updateUpload(key, { status: "done" })
    } catch (e) {
      const message = e instanceof PhotoError || e instanceof Error ? e.message : "The upload didn't work. Try again."
      updateUpload(key, { status: "error", error: message })
    }
  }

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files)
    if (list.length === 0) return
    const added: Upload[] = []
    for (const file of list) {
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      if (!isImageFile(file)) {
        added.push({ key, name: file.name, progress: 0, status: "error", error: "That isn't a photo. Use a JPG, PNG or HEIC." })
        continue
      }
      added.push({ key, name: file.name, progress: 0, status: "waiting" })
      // One at a time, in the order chosen.
      queue.current = queue.current.then(() => uploadOne(file, key))
    }
    // Finished uploads from earlier batches drop off the list.
    setUploads((current) => [...current.filter((u) => u.status !== "done"), ...added])
  }

  const count = photos.length
  const full = count >= MAX_ACTIVE_PHOTOS
  const busy = uploads.some((u) => !["done", "error"].includes(u.status))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-[32px] leading-tight text-balance md:text-[40px]">Your portfolio</h1>
          <p className="text-[15px] text-ink-muted text-pretty">
            <span className="tabular-nums">
              {count} of {MAX_ACTIVE_PHOTOS} photos
            </span>
            <span className="max-md:hidden">. The first photo leads your page and shows on your card in search.</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p aria-live="polite" className="text-sm font-semibold">
            {save.kind === "saving" && <span className="text-ink-muted">Saving</span>}
            {save.kind === "saved" && <span className="text-bottle-green">Saved</span>}
          </p>
          <Link href={publicHref} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-navy underline underline-offset-2 hover:no-underline">
            See your public page
          </Link>
        </div>
      </div>

      {save.kind === "error" && (
        <p role="alert" className="rounded border-1.5 border-flash-red bg-vellum tex-vellum px-4 py-3 text-[15px] font-semibold text-flash-red">
          {save.message}
        </p>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!full) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!full) addFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex flex-col items-center gap-2.5 rounded border-2 border-dashed border-ink bg-vellum tex-vellum p-5 text-center md:p-8",
          dragging && "bg-secondary",
        )}
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true" className="text-ink">
          <path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4" />
        </svg>
        <p className="font-heading text-[20px] leading-tight">
          <span className="md:hidden">Add photos</span>
          <span className="max-md:hidden">Drop photos here</span>
        </p>
        <p className="text-sm text-ink-muted text-pretty">
          {full
            ? `You have ${MAX_ACTIVE_PHOTOS} photos, the most a portfolio can hold. Remove one to add another.`
            : "JPG, PNG or HEIC. Large photos are resized for you. Your own healed or fresh work only."}
        </p>
        <label htmlFor={inputId} className="sr-only">
          Choose photos to add to your portfolio
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="sr-only"
          tabIndex={-1}
          disabled={full}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ""
          }}
        />
        <button type="button" className={PRIMARY} disabled={full} onClick={() => inputRef.current?.click()}>
          Choose photos
        </button>
      </div>

      {uploads.length > 0 && (
        <ul aria-label="Uploads" className="border-t border-rule">
          {uploads.map((u) => (
            <li key={u.key} className="flex flex-col gap-1.5 border-b border-rule py-2.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-semibold">{u.name}</span>
                <span className={cn("shrink-0 tabular-nums", u.status === "error" ? "font-semibold text-flash-red" : "text-ink-muted")}>
                  {STATUS_TEXT[u.status]}
                  {u.status === "uploading" && ` ${u.progress}%`}
                </span>
              </div>
              {u.status !== "error" && u.status !== "done" && (
                <div
                  role="progressbar"
                  aria-label={`Uploading ${u.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={u.progress}
                  className="h-2 w-full overflow-hidden rounded border border-ink bg-paper"
                >
                  <div className="h-full bg-ink transition-[width]" style={{ width: `${u.progress}%` }} />
                </div>
              )}
              {u.error && (
                <p role="alert" className="text-sm text-flash-red">
                  {u.error}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p aria-live="polite" className="sr-only">
        {busy ? "Uploading photos" : ""}
      </p>

      {photos.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, i) => {
            const n = i + 1
            const name = photo.caption ? `"${photo.caption}"` : `photo ${n}`
            return (
              <li key={photo.id} className="flex flex-col gap-2.5 rounded border-1.5 border-ink bg-vellum tex-vellum p-2.5">
                <div className="relative aspect-[4/5] overflow-hidden border border-ink bg-vellum">
                  <Image
                    src={photo.url}
                    alt={photo.caption || `Portfolio photo ${n} by ${artistName}`}
                    fill
                    sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw"
                    className="object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute left-2 top-2 rounded bg-ink px-2 py-0.5 text-xs font-semibold text-cream">
                      First on your page
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={`caption-${photo.id}`} className="text-xs font-semibold">
                    Caption
                  </label>
                  <input
                    id={`caption-${photo.id}`}
                    value={photo.caption}
                    maxLength={MAX_CAPTION}
                    placeholder="Koi sleeve, session 3"
                    onChange={(e) => setCaption(photo.id, e.target.value)}
                    className={FIELD}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={`style-${photo.id}`} className="text-xs font-semibold">
                    Style
                  </label>
                  <select
                    id={`style-${photo.id}`}
                    value={photo.style}
                    onChange={(e) => setStyle(photo.id, e.target.value)}
                    className={FIELD}
                  >
                    <option value="">No style</option>
                    {STYLES.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex gap-1.5">
                    <button
                      type="button"
                      ref={(el) => {
                        moveButtons.current.set(`${photo.id}:up`, el)
                      }}
                      aria-label={`Move ${name} earlier`}
                      disabled={i === 0}
                      onClick={() => move(i, "up")}
                      className={ICON_BUTTON}
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      ref={(el) => {
                        moveButtons.current.set(`${photo.id}:down`, el)
                      }}
                      aria-label={`Move ${name} later`}
                      disabled={i === photos.length - 1}
                      onClick={() => move(i, "down")}
                      className={ICON_BUTTON}
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </span>
                  <button type="button" onClick={() => void remove(i)} aria-label={`Remove ${name}`} className={TEXT_BUTTON}>
                    Remove
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-[13px] text-ink-muted text-pretty">
        By uploading you confirm the work is yours and you have the client&apos;s OK to share it. Changes save
        automatically.
      </p>
    </div>
  )
}
