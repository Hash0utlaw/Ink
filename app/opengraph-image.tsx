import { ImageResponse } from "next/og"

export const alt = "TattooMaps — Find tattoo artists and shops across the US"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Fetch a Poppins TTF from Google Fonts at build time. If the network is
// unavailable, fall back to next/og's default font rather than failing.
async function loadFont(weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Poppins:wght@${weight}`).then((r) => r.text())
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1]
    if (!url) return null
    const res = await fetch(url)
    return res.ok ? await res.arrayBuffer() : null
  } catch {
    return null
  }
}

export default async function OpengraphImage() {
  const [bold, regular] = await Promise.all([loadFont(800), loadFont(400)])
  const fonts = [
    ...(bold ? [{ name: "Poppins", data: bold, weight: 800 as const, style: "normal" as const }] : []),
    ...(regular ? [{ name: "Poppins", data: regular, weight: 400 as const, style: "normal" as const }] : []),
  ]

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#FBF7EE",
          color: "#1A1A1A",
          fontFamily: fonts.length ? "Poppins" : undefined,
        }}
      >
        <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>TattooMaps</div>
        <div style={{ width: 120, height: 8, background: "#1F4E79", borderRadius: 4, marginTop: 36 }} />
        <div style={{ fontSize: 44, fontWeight: 400, marginTop: 36 }}>Find tattoo artists and shops across the US</div>
        <div style={{ fontSize: 28, fontWeight: 400, marginTop: 28, color: "#1F4E79" }}>
          26,000+ shops · 21,000+ artists · All 50 states
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
