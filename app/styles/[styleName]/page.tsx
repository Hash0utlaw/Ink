import { notFound } from "next/navigation"
import { Suspense } from "react"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getArtistsByStyle } from "@/lib/mock-data"
import { StyleHeader } from "@/components/styles/style-header"
import { StyleImageGallery } from "@/components/styles/style-image-gallery"
import { StyleArtistsList } from "@/components/styles/style-artists-list"

const styleData: { [key: string]: { title: string; description: string; images: string[] } } = {
  realism: {
    title: "Realism Tattoos",
    description:
      "Realism tattoos are works of art that depict subjects truthfully, without stylization. From lifelike portraits to breathtaking nature scenes, these tattoos capture the world as it is.",
    images: [
      "/styles/realism-portrait-1.png",
      "/styles/realism-animal-1.png",
      "/styles/realism-nature-1.png",
      "/styles/realism-portrait-2.png",
      "/styles/realism-flower-1.png",
      "/styles/realism-eye-1.png",
      "/styles/realism-landscape-1.png",
      "/styles/realism-animal-2.png",
      "/styles/realism-portrait-3.png",
    ],
  },
  traditional: {
    title: "Traditional Tattoos",
    description:
      "Also known as American Traditional or Old School, this style is defined by bold black outlines, a limited color palette, and iconic imagery like roses, anchors, and eagles.",
    images: [
      "/styles/traditional-rose-1.png",
      "/styles/traditional-anchor-1.png",
      "/styles/traditional-eagle-1.png",
      "/styles/traditional-skull-1.png",
      "/styles/traditional-ship-1.png",
      "/styles/traditional-dagger-1.png",
      "/styles/traditional-heart-1.png",
      "/styles/traditional-swallow-1.png",
      "/styles/traditional-pin-up-1.png",
    ],
  },
  geometric: {
    title: "Geometric Tattoos",
    description:
      "Geometric tattoos use lines, shapes, and patterns to create intricate and often abstract designs. This style is celebrated for its precision, symmetry, and symbolic depth.",
    images: [
      "/styles/geometric-mandala-1.png",
      "/styles/geometric-animal-1.png",
      "/styles/geometric-sacred-1.png",
      "/styles/geometric-abstract-1.png",
      "/styles/geometric-flower-1.png",
      "/styles/geometric-triangle-1.png",
      "/styles/geometric-hexagon-1.png",
      "/styles/geometric-spiral-1.png",
      "/styles/geometric-crystal-1.png",
    ],
  },
  watercolor: {
    title: "Watercolor Tattoos",
    description:
      "Mimicking the fluid and vibrant look of watercolor paintings, these tattoos feature soft edges, color splashes, and a painterly feel. They are a beautiful way to create a unique, artistic statement.",
    images: [
      "/styles/watercolor-flower-1.png",
      "/styles/watercolor-bird-1.png",
      "/styles/watercolor-abstract-1.png",
      "/styles/watercolor-butterfly-1.png",
      "/styles/watercolor-tree-1.png",
      "/styles/watercolor-splash-1.png",
      "/styles/watercolor-feather-1.png",
      "/styles/watercolor-galaxy-1.png",
      "/styles/watercolor-ocean-1.png",
    ],
  },
  japanese: {
    title: "Japanese Tattoos",
    description:
      "Rooted in centuries of tradition, Japanese tattoos (Irezumi) are rich with symbolism and storytelling. They often feature large-scale designs with mythological creatures and natural elements.",
    images: [
      "/styles/japanese-dragon-1.png",
      "/styles/japanese-koi-1.png",
      "/styles/japanese-cherry-1.png",
      "/styles/japanese-tiger-1.png",
      "/styles/japanese-phoenix-1.png",
      "/styles/japanese-wave-1.png",
      "/styles/japanese-oni-1.png",
      "/styles/japanese-samurai-1.png",
      "/styles/japanese-lotus-1.png",
    ],
  },
  blackwork: {
    title: "Blackwork Tattoos",
    description:
      "Blackwork is a broad style that uses solid black ink to create bold and striking tattoos. It encompasses everything from ancient tribal patterns to modern abstract and geometric designs.",
    images: [
      "/styles/blackwork-tribal-1.png",
      "/styles/blackwork-abstract-1.png",
      "/styles/blackwork-ornamental-1.png",
      "/styles/blackwork-botanical-1.png",
      "/styles/blackwork-geometric-1.png",
      "/styles/blackwork-mandala-1.png",
      "/styles/blackwork-animal-1.png",
      "/styles/blackwork-pattern-1.png",
      "/styles/blackwork-minimalist-1.png",
    ],
  },
  "fine-line": {
    title: "Fine Line Tattoos",
    description:
      "Characterized by thin, delicate lines, this style is perfect for creating detailed and elegant designs. It's a popular choice for subtle yet impactful tattoos.",
    images: [
      "/styles/fine-line-flower-1.png",
      "/styles/fine-line-minimalist-1.png",
      "/styles/fine-line-script-1.png",
      "/styles/fine-line-botanical-1.png",
      "/styles/fine-line-geometric-1.png",
      "/styles/fine-line-animal-1.png",
      "/styles/fine-line-constellation-1.png",
      "/styles/fine-line-portrait-1.png",
      "/styles/fine-line-abstract-1.png",
    ],
  },
}

export default async function StylePage({ params }: { params: { styleName: string } }) {
  const styleInfo = styleData[params.styleName]
  if (!styleInfo) {
    notFound()
  }

  const artists = await getArtistsByStyle(params.styleName)

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <StyleHeader title={styleInfo.title} description={styleInfo.description} />
          <div className="my-12">
            <StyleImageGallery images={styleInfo.images} />
          </div>
          <StyleArtistsList artists={artists} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
