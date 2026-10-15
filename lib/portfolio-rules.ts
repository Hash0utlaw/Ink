// Portfolio limits shared by the dashboard uploader and app/api/artist/portfolio.

/** Most active photos one artist can show. */
export const MAX_ACTIVE_PHOTOS = 40
/** Longest caption, in characters. */
export const MAX_CAPTION = 140
/** The storage bucket's per-file limit (5 MB). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
/** Uploads are resized so the longest side is at most this many pixels. */
export const MAX_SIDE_PX = 2000
