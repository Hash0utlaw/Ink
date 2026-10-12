"use client"

import { useId, useRef, useState } from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { getClient } from "@/utils/supabase/client"
import { PORTFOLIO_PUBLIC_PREFIX } from "@/lib/utils/safe-image"
import { cn } from "@/lib/utils"

const MAX_BYTES = 5 * 1024 * 1024
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }

const SECONDARY =
  "inline-flex min-h-11 items-center rounded border-1.5 border-ink bg-vellum tex-vellum px-4 text-[15px] font-semibold text-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
const TEXT_BUTTON =
  "min-h-11 px-1 text-[15px] font-semibold text-navy underline underline-offset-2 hover:no-underline disabled:opacity-60"

interface ImageUploaderProps {
  kind: "avatar" | "cover"
  artistId: string
  initialUrl: string | null
}

const COPY = {
  avatar: { label: "Profile photo", hint: "Square works best, at least 800x800.", folder: "avatars" },
  cover: { label: "Cover image", hint: "1600x500 works best. It's cropped to fit the strip.", folder: "covers" },
} as const

/** Our storage path for one of this artist's files, or null for any other URL. */
function storagePath(url: string | null): string | null {
  return url && url.startsWith(PORTFOLIO_PUBLIC_PREFIX) ? url.slice(PORTFOLIO_PUBLIC_PREFIX.length) : null
}

/**
 * Upload, replace or remove the artist's profile photo or cover image.
 * JPG, PNG or WebP up to 5 MB, stored in portfolio/{avatars|covers}/{artist_id}/.
 * Storage policies only let the artist's own account write there.
 */
export function ImageUploader({ kind, artistId, initialUrl }: ImageUploaderProps) {
  const copy = COPY[kind]
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  async function saveUrl(next: string | null) {
    const res = await fetch("/api/artist/images", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, url: next }),
    })
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(json.error ?? "Couldn't save the change.")
    }
  }

  // Best effort: an old file left behind only costs storage.
  async function removeFile(oldUrl: string | null) {
    const path = storagePath(oldUrl)
    if (path) await getClient()?.storage.from("portfolio").remove([path])
  }

  async function handleFile(file: File) {
    setError(null)
    setSaved(null)
    const ext = TYPES[file.type]
    if (!ext) return setError("Use a JPG, PNG or WebP image.")
    if (file.size > MAX_BYTES) return setError("That file is over 5 MB.")

    const supabase = getClient()
    if (!supabase) return setError("Uploads aren't available right now.")

    setBusy(true)
    try {
      const path = `${copy.folder}/${artistId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("portfolio")
        .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false })
      if (uploadError) throw new Error(uploadError.message)

      const { data } = supabase.storage.from("portfolio").getPublicUrl(path)
      try {
        await saveUrl(data.publicUrl)
      } catch (e) {
        await supabase.storage.from("portfolio").remove([path])
        throw e
      }
      const previous = url
      setUrl(data.publicUrl)
      setSaved(previous ? `${copy.label} replaced.` : `${copy.label} added.`)
      await removeFile(previous)
    } catch (e) {
      setError((e as Error).message || "The upload didn't work. Try again.")
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function handleRemove() {
    setError(null)
    setSaved(null)
    setBusy(true)
    try {
      await saveUrl(null)
      const previous = url
      setUrl(null)
      setSaved(`${copy.label} removed.`)
      await removeFile(previous)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={inputId} className="block text-[15px] font-semibold text-ink">
          {copy.label}
        </label>
        <p className="text-sm text-ink-muted">JPG, PNG or WebP, up to 5 MB. {copy.hint}</p>
      </div>

      <div
        className={cn(
          "relative overflow-hidden border-1.5 border-ink bg-vellum tex-vellum",
          kind === "cover" ? "aspect-[16/5] w-full max-w-xl" : "aspect-square w-32",
        )}
      >
        {url ? (
          <Image src={url} alt={`Your ${copy.label.toLowerCase()}`} fill sizes={kind === "cover" ? "576px" : "128px"} className="object-cover" />
        ) : (
          <p className="flex h-full items-center justify-center p-3 text-center text-sm text-ink-muted">
            {kind === "cover" ? "No cover yet. Your profile shows the TattooMaps banner." : "No photo yet"}
          </p>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-vellum/80">
            <Loader2 className="h-5 w-5 animate-spin text-ink" aria-label="Uploading" />
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={SECONDARY} disabled={busy} onClick={() => inputRef.current?.click()}>
          {url ? "Replace" : "Upload"}
        </button>
        {url && (
          <button type="button" className={TEXT_BUTTON} disabled={busy} onClick={handleRemove}>
            Remove
          </button>
        )}
      </div>
      <p aria-live="polite" className={cn("text-sm", error ? "font-semibold text-flash-red" : "text-bottle-green")}>
        {error ?? saved}
      </p>
    </div>
  )
}
