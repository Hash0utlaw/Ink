const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

/** Escape user-supplied text before placing it in email HTML. */
export function escapeHtml(value: unknown): string {
  if (value == null) return ""
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch])
}
