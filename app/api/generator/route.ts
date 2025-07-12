import { generateText } from "ai"
import { replicate } from "@ai-sdk/replicate"
import { NextResponse } from "next/server"

// IMPORTANT! Set the REPLICATE_API_TOKEN environment variable

export const maxDuration = 30 // Set a higher timeout for image generation

export async function POST(req: Request) {
  try {
    const { prompt, style, placement, color } = await req.json()

    if (!prompt) {
      return NextResponse.json({ message: "Prompt is required" }, { status: 400 })
    }

    // Construct a more detailed prompt for better results
    const fullPrompt = `A professional, clean, high-resolution tattoo design of ${prompt}.
Style: ${style}.
Color: ${color === "full_color" ? "vibrant full color" : "black and gray"}.
Placement suggestion: ${placement}.
The design should be on a clean, white background, studio quality, ready for a tattoo artist.`

    // We will generate 4 images in parallel
    const imagePromises = Array.from({ length: 4 }).map(() =>
      generateText({
        model: replicate("stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b"),
        prompt: fullPrompt,
      }),
    )

    const imageResults = await Promise.all(imagePromises)
    const imageUrls = imageResults.map((result) => result.text)

    return NextResponse.json({ images: imageUrls })
  } catch (error) {
    console.error("Image generation failed:", error)
    return NextResponse.json({ message: "Failed to generate images" }, { status: 500 })
  }
}
