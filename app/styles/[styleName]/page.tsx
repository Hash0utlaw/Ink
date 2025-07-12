import { notFound } from "next/navigation"
import { Suspense } from "react"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getArtistsByStyle } from "@/lib/mock-data"
import { StyleHeader } from "@/components/styles/style-header"
import { StyleImageGallery } from "@/components/styles/style-image-gallery"
import { StyleArtistsList } from "@/components/styles/style-artists-list"

const styleData: { [key: string]: { title: string; description: string; query: string } } = {
  realism: {
    title: "Realism Tattoos",
    description:
      "Realism tattoos are works of art that depict subjects truthfully, without stylization. From lifelike portraits to breathtaking nature scenes, these tattoos capture the world as it is.",
    query: "photorealistic+tattoo",
  },
  traditional: {
    title: "Traditional Tattoos",
    description:
      "Also known as American Traditional or Old School, this style is defined by bold black outlines, a limited color palette, and iconic imagery like roses, anchors, and eagles.",
    query: "american+traditional+tattoo",
  },
  geometric: {
    title: "Geometric Tattoos",
    description:
      "Geometric tattoos use lines, shapes, and patterns to create intricate and often abstract designs. This style is celebrated for its precision, symmetry, and symbolic depth.",
    query: "geometric+tattoo",
  },
  watercolor: {
    title: "Watercolor Tattoos",
    description:
      "Mimicking the fluid and vibrant look of watercolor paintings, these tattoos feature soft edges, color splashes, and a painterly feel. They are a beautiful way to create a unique, artistic statement.",
    query: "watercolor+tattoo",
  },
  japanese: {
    title: "Japanese Tattoos",
    description:
      "Rooted in centuries of tradition, Japanese tattoos (Irezumi) are rich with symbolism and storytelling. They often feature large-scale designs with mythological creatures and natural elements.",
    query: "japanese+irezumi+tattoo",
  },
  blackwork: {
    title: "Blackwork Tattoos",
    description:
      "Blackwork is a broad style that uses solid black ink to create bold and striking tattoos. It encompasses everything from ancient tribal patterns to modern abstract and geometric designs.",
    query: "blackwork+tattoo",
  },
  "fine-line": {
    title: "Fine Line Tattoos",
    description:
      "Characterized by thin, delicate lines, this style is perfect for creating detailed and elegant designs. It's a popular choice for subtle yet impactful tattoos.",
    query: "fine+line+tattoo",
  },
}

export default async function StylePage({ params }: { params: { styleName: string } }) {
  const styleInfo = styleData[params.styleName]
  if (!styleInfo) {
    notFound()
  }

  const artists = await getArtistsByStyle(params.styleName)
  const galleryImages = Array.from(
    { length: 9 },
    (_, i) => `/placeholder.svg?height=400&width=400&query=${styleInfo.query}+${i}`,
  )

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <StyleHeader title={styleInfo.title} description={styleInfo.description} />
          <div className="my-12">
            <StyleImageGallery images={galleryImages} />
          </div>
          <StyleArtistsList artists={artists} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
