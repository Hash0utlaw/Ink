// Browser only. Gets a photo ready for the 5 MB portfolio bucket: HEIC/HEIF
// (iPhone) converted to JPEG with heic2any, then resized so the longest side is
// at most 2000px and encoded as JPEG at about 0.85 quality.

import { MAX_SIDE_PX, MAX_UPLOAD_BYTES } from "@/lib/portfolio-rules"

const QUALITY = 0.85

export class PhotoError extends Error {}

export function isHeic(file: File): boolean {
  return /^image\/hei[cf](-sequence)?$/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
}

/** Usable as a photo: any image type, or a HEIC the browser didn't label. */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || isHeic(file)
}

async function decode(blob: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      // Applies the EXIF orientation, so phone photos come out upright.
      const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" })
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
    } catch {
      // Fall back to <img> below.
    }
  }
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = "async"
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
  } catch {
    URL.revokeObjectURL(url)
    throw new PhotoError("This file couldn't be opened as a photo. Try a JPG, PNG or HEIC.")
  }
}

/** A JPEG blob under 5 MB, longest side 2000px or less. Throws PhotoError with a message for the artist. */
export async function preparePhoto(file: File): Promise<Blob> {
  if (!isImageFile(file)) throw new PhotoError("That isn't a photo. Use a JPG, PNG or HEIC.")

  let blob: Blob = file
  if (isHeic(file)) {
    try {
      const heic2any = (await import("heic2any")).default
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 })
      blob = Array.isArray(converted) ? converted[0] : converted
    } catch {
      throw new PhotoError("This HEIC photo couldn't be converted. Try exporting it as a JPG.")
    }
  }

  const image = await decode(blob)
  try {
    const scale = Math.min(1, MAX_SIDE_PX / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new PhotoError("Your browser couldn't resize this photo.")
    // JPEG has no transparency: PNGs get a white background, not black.
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(image.source, 0, 0, width, height)
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY))
    if (!jpeg) throw new PhotoError("Your browser couldn't resize this photo.")
    if (jpeg.size > MAX_UPLOAD_BYTES) {
      throw new PhotoError("This photo is still over 5 MB after resizing. Try a smaller or simpler photo.")
    }
    return jpeg
  } finally {
    image.close()
  }
}
