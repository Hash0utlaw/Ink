import { BRAND_HEX as C } from "@/lib/brand-colors"
import { escapeHtml } from "@/lib/escape-html"
import { EMAIL_SITE_URL, SUPPORT_EMAIL } from "@/lib/site-config"

// One shell for every transactional email: paper page, vellum card with an ink
// border, a night header with the cream wordmark, and a muted footer. Content is
// built from blocks so the HTML and plain-text versions always match, and every
// value is escaped here, so callers pass raw (user-provided) strings.

type Inline = string | { strong: string } | { link: string; href: string }

type Block =
  | { kind: "p"; parts: Inline[]; small?: boolean }
  | { kind: "subheading"; text: string }
  | { kind: "fields"; rows: [string, string | null | undefined][] }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: Inline[][] }
  | { kind: "button"; label: string; href: string }

export const strong = (text: string): Inline => ({ strong: text })
export const link = (label: string, href: string): Inline => ({ link: label, href })
export const p = (...parts: Inline[]): Block => ({ kind: "p", parts })
/** Small muted note. */
export const note = (...parts: Inline[]): Block => ({ kind: "p", parts, small: true })
export const subheading = (text: string): Block => ({ kind: "subheading", text })
/** "Label: value" rows; empty values are skipped. */
export const fields = (rows: [string, string | null | undefined][]): Block => ({ kind: "fields", rows })
export const quote = (text: string): Block => ({ kind: "quote", text })
export const list = (items: Inline[][]): Block => ({ kind: "list", items })
/** The email's one primary action. */
export const button = (label: string, href: string): Block => ({ kind: "button", label, href })

/** Absolute URL on the live site. */
export const siteUrl = (path: string) => `${EMAIL_SITE_URL}${path}`

const FONT = "Arial, Helvetica, sans-serif"
const SERIF = "Georgia, 'Times New Roman', serif"
const LINK_STYLE = `color:${C.navy};text-decoration:underline;font-weight:bold;`

// Escape, then keep the sender's line breaks.
const html = (text: string) => escapeHtml(text).replace(/\r?\n/g, "<br />")

function inlineHtml(part: Inline): string {
  if (typeof part === "string") return html(part)
  if ("strong" in part) return `<strong>${html(part.strong)}</strong>`
  return `<a href="${escapeHtml(part.href)}" style="${LINK_STYLE}">${html(part.link)}</a>`
}

function inlineText(part: Inline): string {
  if (typeof part === "string") return part
  if ("strong" in part) return part.strong
  return part.link === part.href ? part.href : `${part.link} (${part.href})`
}

const filled = (rows: [string, string | null | undefined][]) =>
  rows.filter((row): row is [string, string] => typeof row[1] === "string" && row[1].trim() !== "")

function blockHtml(block: Block): string {
  switch (block.kind) {
    case "p":
      return block.small
        ? `<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:${C.inkMuted};">${block.parts.map(inlineHtml).join("")}</p>`
        : `<p style="margin:0 0 16px;">${block.parts.map(inlineHtml).join("")}</p>`
    case "subheading":
      return `<h2 style="margin:24px 0 8px;font-family:${SERIF};font-size:19px;font-weight:normal;line-height:1.2;color:${C.ink};">${html(block.text)}</h2>`
    case "fields": {
      const rows = filled(block.rows)
      if (rows.length === 0) return ""
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">${rows
        .map(
          ([label, value]) =>
            `<tr><td valign="top" style="padding:0 16px 6px 0;font-family:${FONT};font-size:16px;line-height:1.55;color:${C.inkMuted};white-space:nowrap;">${html(label)}</td><td valign="top" style="padding:0 0 6px;font-family:${FONT};font-size:16px;line-height:1.55;color:${C.ink};">${html(value)}</td></tr>`,
        )
        .join("")}</table>`
    }
    case "quote":
      return `<div style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${C.ink};background:${C.paper};">${html(block.text)}</div>`
    case "list":
      return `<ul style="margin:0 0 16px;padding-left:20px;">${block.items
        .map((item) => `<li style="margin:0 0 6px;">${item.map(inlineHtml).join("")}</li>`)
        .join("")}</ul>`
    case "button":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="background:${C.flashRed};border:1.5px solid ${C.ink};border-radius:4px;"><a href="${escapeHtml(block.href)}" style="display:inline-block;padding:0 24px;height:44px;line-height:44px;font-family:${FONT};font-size:16px;font-weight:bold;color:${C.white};text-decoration:none;">${html(block.label)}</a></td></tr></table>`
  }
}

function blockText(block: Block): string {
  switch (block.kind) {
    case "p":
      return block.parts.map(inlineText).join("")
    case "subheading":
      return block.text
    case "fields":
      return filled(block.rows)
        .map(([label, value]) => `${label}: ${value}`)
        .join("\n")
    case "quote":
      return block.text
    case "list":
      return block.items.map((item) => `- ${item.map(inlineText).join("")}`).join("\n")
    case "button":
      return `${block.label}: ${block.href}`
  }
}

export interface EmailContent {
  heading: string
  blocks: Block[]
  /** Why the recipient got this email, as a sentence ending "because …". */
  reason: string
}

export interface RenderedEmail {
  html: string
  text: string
}

export function renderEmail({ heading, blocks, reason }: EmailContent): RenderedEmail {
  const body = blocks.map(blockHtml).filter(Boolean).join("\n")
  const wordmark = siteUrl("/brand/logo-wordmark-cream.png")

  const htmlDoc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${html(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${C.paper};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.paper};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${C.vellum};border:1.5px solid ${C.ink};border-radius:4px;border-collapse:separate;">
<tr><td style="background:${C.night};padding:14px 24px;border-radius:2px 2px 0 0;"><img src="${escapeHtml(wordmark)}" alt="TattooMaps" width="70" height="40" style="display:block;width:70px;height:40px;border:0;" /></td></tr>
<tr><td style="padding:28px 24px 8px;font-family:${FONT};font-size:16px;line-height:1.55;color:${C.ink};">
<h1 style="margin:0 0 16px;font-family:${SERIF};font-size:26px;font-weight:normal;line-height:1.2;color:${C.ink};">${html(heading)}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 24px 24px;border-top:1px solid ${C.rule};font-family:${FONT};font-size:13px;line-height:1.5;color:${C.inkMuted};">
You're getting this email ${html(reason)}<br />
Questions? Email <a href="mailto:${SUPPORT_EMAIL}" style="color:${C.navy};text-decoration:underline;">${SUPPORT_EMAIL}</a>.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

  const text = [
    heading,
    "",
    ...blocks.map(blockText).filter(Boolean).flatMap((t) => [t, ""]),
    "--",
    `You're getting this email ${reason}`,
    `Questions? Email ${SUPPORT_EMAIL}.`,
  ].join("\n")

  return { html: htmlDoc, text }
}
