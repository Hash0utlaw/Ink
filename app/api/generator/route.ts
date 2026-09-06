import { NextResponse } from "next/server"

// The AI generator is disabled pending launch (cost-risk: no auth, no rate
// limit, no plan gate — see launch-blocker plan). The working Replicate
// integration below is preserved so it can be restored later.
export async function POST() {
  return new NextResponse(null, { status: 404 })
}

// --- Disabled implementation (restore when the generator relaunches) ---
//
// import { experimental_generateImage as generateImage } from "ai"
// import { replicate } from "@ai-sdk/replicate"
//
// export const maxDuration = 60 // Image generation can take a while
//
// export async function POST(req: Request) {
//   try {
//     if (!process.env.REPLICATE_API_TOKEN) {
//       return NextResponse.json(
//         { message: "The AI generator is not configured yet. Missing REPLICATE_API_TOKEN." },
//         { status: 503 },
//       )
//     }
//
//     const { prompt, style, placement, color } = await req.json()
//
//     if (!prompt) {
//       return NextResponse.json({ message: "Prompt is required" }, { status: 400 })
//     }
//
//     // Construct a more detailed prompt for better results
//     const fullPrompt = `A professional, clean, high-resolution tattoo design of ${prompt}.
// Style: ${style}.
// Color: ${color === "full_color" ? "vibrant full color" : "black and gray"}.
// Placement suggestion: ${placement}.
// The design should be on a clean, white background, studio quality, ready for a tattoo artist.`
//
//     const { images } = await generateImage({
//       model: replicate.image("black-forest-labs/flux-schnell"),
//       prompt: fullPrompt,
//       n: 4,
//     })
//
//     const imageUrls = images.map((image) => `data:${image.mediaType};base64,${image.base64}`)
//
//     return NextResponse.json({ images: imageUrls })
//   } catch (error) {
//     console.error("Image generation failed:", error)
//     return NextResponse.json({ message: "Failed to generate images" }, { status: 500 })
//   }
// }
