import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"
import { BRAND_HEX as C } from "@/lib/brand-colors"
import type { StyleSlug } from "@/lib/styles"

// Social share images (Open Graph and Twitter, 1200×630): the night chart with
// the cream monogram, a Young Serif title and one muted line. next/og reads
// .woff but not .woff2, so app/fonts has .woff copies of Young Serif and Libre
// Franklin for these images only.

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 }
export const SHARE_IMAGE_TYPE = "image/png"

const CREAM_GRID = "rgba(246, 238, 220, 0.09)" // cream at 9%

async function readAsset(rel: string): Promise<Buffer | null> {
  try {
    return await readFile(path.join(process.cwd(), rel))
  } catch {
    return null
  }
}

const arrayBuffer = (buf: Buffer) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer

// ─── Style marks ──────────────────────────────────────────────────────────────

// The style symbols (components/brand/style-symbol.tsx) in one color, like the
// cream guide symbol on the style pages' night hero.
type Shape = "circle" | "square" | "diamond" | "triangle"
type Fill = "solid" | "outline" | "half" | "dot" | "solid-dot"

const MARKS: Record<StyleSlug, [Shape, Fill]> = {
  "black-and-grey": ["circle", "half"],
  realism: ["square", "solid"],
  traditional: ["diamond", "solid"],
  "fine-line": ["circle", "outline"],
  illustrative: ["triangle", "solid"],
  color: ["circle", "solid-dot"],
  "neo-traditional": ["diamond", "solid"],
  blackwork: ["circle", "solid"],
  floral: ["triangle", "solid"],
  japanese: ["circle", "solid"],
  portrait: ["square", "solid"],
  anime: ["triangle", "solid"],
  "cover-ups": ["square", "outline"],
  geometric: ["triangle", "outline"],
  lettering: ["triangle", "solid"],
  ornamental: ["diamond", "solid"],
  "new-school": ["circle", "solid"],
  tribal: ["diamond", "solid"],
  watercolor: ["triangle", "solid"],
  dotwork: ["circle", "dot"],
  chicano: ["diamond", "solid"],
}

const DIAMOND = "M8 1 L15 8 L8 15 L1 8 Z"
const TRIANGLE = "M8 1.5 L15 14.5 L1 14.5 Z"

/** A style's symbol in cream; a plain outline circle when there's no exact master style. */
export function StyleMark({ slug, size = 72 }: { slug: StyleSlug | null; size?: number }) {
  const [shape, fill] = (slug && MARKS[slug]) || (["circle", "outline"] as const)
  const outline = { fill: "none", stroke: C.cream, strokeWidth: 1.5, strokeLinejoin: "round" as const }
  const solid = { fill: C.cream }

  let body
  if (shape === "circle") {
    body =
      fill === "outline" ? (
        <circle cx="8" cy="8" r="6" {...outline} />
      ) : fill === "dot" ? (
        <g>
          <circle cx="8" cy="8" r="6" {...outline} />
          <circle cx="8" cy="8" r="2" {...solid} />
        </g>
      ) : fill === "half" ? (
        <g>
          <circle cx="8" cy="8" r="6.5" fill={C.night} stroke={C.cream} strokeWidth={1.5} />
          <path d="M8 1.5 A6.5 6.5 0 0 0 8 14.5 Z" {...solid} />
        </g>
      ) : fill === "solid-dot" ? (
        <g>
          <circle cx="8" cy="8" r="6.5" {...solid} />
          <circle cx="8" cy="8" r="2.6" fill={C.night} />
        </g>
      ) : (
        <circle cx="8" cy="8" r="6.5" {...solid} />
      )
  } else if (shape === "square") {
    body =
      fill === "outline" ? (
        <rect x="2.5" y="2.5" width="11" height="11" {...outline} />
      ) : (
        <rect x="2" y="2" width="12" height="12" {...solid} />
      )
  } else {
    const d = shape === "diamond" ? DIAMOND : TRIANGLE
    body = fill === "outline" ? <path d={d} {...outline} /> : <path d={d} {...solid} />
  }

  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      {body}
    </svg>
  )
}

// ─── Image ────────────────────────────────────────────────────────────────────

// The share-image fonts only cover Latin text. Fold styled Unicode letters
// ("𝐀𝐩𝐩𝐨𝐢𝐧𝐭𝐦𝐞𝐧𝐭" → "Appointment") and drop emoji, which would render as boxes.
function forImage(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
}

function titleSize(title: string): number {
  if (title.length <= 18) return 84
  if (title.length <= 30) return 68
  if (title.length <= 48) return 54
  return 44
}

interface ShareImageProps {
  title: string
  /** One short muted line under the title. */
  line?: string | null
  /** Style symbol shown above the title. */
  styleSlug?: StyleSlug | null
}

export async function shareImage(props: ShareImageProps): Promise<ImageResponse> {
  const title = forImage(props.title)
  const line = props.line ? forImage(props.line) : null
  const { styleSlug } = props
  const [heading, body, monogram] = await Promise.all([
    readAsset("app/fonts/young-serif-latin-400-normal.woff"),
    readAsset("app/fonts/libre-franklin-latin-400-normal.woff"),
    readAsset("public/brand/banner-cream.png"),
  ])
  // A missing font falls back to next/og's default rather than failing.
  const fonts = [
    ...(heading ? [{ name: "Young Serif", data: arrayBuffer(heading), weight: 400 as const, style: "normal" as const }] : []),
    ...(body ? [{ name: "Libre Franklin", data: arrayBuffer(body), weight: 400 as const, style: "normal" as const }] : []),
  ]

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 88px",
          backgroundColor: C.night,
          backgroundImage: `linear-gradient(to right, ${CREAM_GRID} 1px, transparent 1px), linear-gradient(to bottom, ${CREAM_GRID} 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          color: C.cream,
          fontFamily: body ? "Libre Franklin" : undefined,
        }}
      >
        {monogram && (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img
            src={`data:image/png;base64,${monogram.toString("base64")}`}
            width={320}
            height={220}
            style={{ flexShrink: 0, objectFit: "contain" }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          {styleSlug !== undefined && (
            <div style={{ display: "flex", marginBottom: 28 }}>
              <StyleMark slug={styleSlug} />
            </div>
          )}
          <div
            style={{
              fontFamily: heading ? "Young Serif" : undefined,
              fontSize: titleSize(title),
              lineHeight: 1.08,
              maxHeight: titleSize(title) * 1.08 * 3,
              overflow: "hidden",
            }}
          >
            {title}
          </div>
          {line && (
            <div style={{ marginTop: 24, fontSize: 28, lineHeight: 1.3, opacity: 0.72, textWrap: "balance" }}>{line}</div>
          )}
        </div>
      </div>
    ),
    { ...SHARE_IMAGE_SIZE, fonts },
  )
}
