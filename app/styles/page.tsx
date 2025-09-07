import { Suspense } from "react"
import Link from "next/link"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { MotionView } from "@/components/utils/motion-view"

const styles = [
  {
    name: "Realism",
    query: "photorealistic+tattoo",
    slug: "realism",
    heroImage: "/styles/heroes/realism-hero.png",
    description: "Lifelike portraits and detailed artwork",
  },
  {
    name: "Traditional",
    query: "american+traditional+tattoo",
    slug: "traditional",
    heroImage: "/styles/heroes/traditional-hero.png",
    description: "Bold lines and classic American imagery",
  },
  {
    name: "Geometric",
    query: "geometric+tattoo",
    slug: "geometric",
    heroImage: "/styles/heroes/geometric-hero.png",
    description: "Sacred geometry and mathematical precision",
  },
  {
    name: "Watercolor",
    query: "watercolor+tattoo",
    slug: "watercolor",
    heroImage: "/styles/heroes/watercolor-hero.png",
    description: "Fluid colors and artistic brush strokes",
  },
  {
    name: "Japanese",
    query: "japanese+irezumi+tattoo",
    slug: "japanese",
    heroImage: "/styles/heroes/japanese-hero.png",
    description: "Traditional Irezumi and oriental motifs",
  },
  {
    name: "Blackwork",
    query: "blackwork+tattoo",
    slug: "blackwork",
    heroImage: "/styles/heroes/blackwork-hero.png",
    description: "Bold black ink and tribal patterns",
  },
  {
    name: "Fine Line",
    query: "fine+line+tattoo",
    slug: "fine-line",
    heroImage: "/styles/heroes/fine-line-hero.png",
    description: "Delicate lines and minimalist designs",
  },
]

export default function AllStylesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Explore Tattoo Styles</h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              From timeless classics to modern masterpieces, discover the perfect style for your next piece of art.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {styles.map((style, i) => (
              <MotionView key={style.name} delay={i * 0.1}>
                <Link href={`/styles/${style.slug}`}>
                  <div className="group relative overflow-hidden rounded-xl cursor-pointer aspect-[4/3] shadow-lg hover:shadow-2xl transition-all duration-300">
                    <img
                      src={style.heroImage || "/placeholder.svg"}
                      alt={`${style.name} tattoo style`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="font-bold text-white text-2xl mb-2 group-hover:text-primary transition-colors">
                        {style.name}
                      </h3>
                      <p className="text-gray-200 text-sm opacity-90">{style.description}</p>
                    </div>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-primary/20 backdrop-blur-sm rounded-full p-2">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </MotionView>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
