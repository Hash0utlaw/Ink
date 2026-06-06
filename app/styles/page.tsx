import { Suspense } from "react"
import Link from "next/link"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { MotionView } from "@/components/utils/motion-view"

const styles = [
  {
    name: "Realism",
    slug: "realism",
    description: "Lifelike portraits and detailed artwork",
    heroImage: "https://images.unsplash.com/photo-1590246814883-55516d489f2a?w=600&q=80",
  },
  {
    name: "Traditional",
    slug: "traditional",
    description: "Bold lines and classic American imagery",
    heroImage: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&q=80",
  },
  {
    name: "Geometric",
    slug: "geometric",
    description: "Sacred geometry and mathematical precision",
    heroImage: "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=600&q=80",
  },
  {
    name: "Watercolor",
    slug: "watercolor",
    description: "Fluid colors and artistic brush strokes",
    heroImage: "https://images.unsplash.com/photo-1542396601-dca920ea2807?w=600&q=80",
  },
  {
    name: "Japanese",
    slug: "japanese",
    description: "Traditional Irezumi and oriental motifs",
    heroImage: "https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=600&q=80",
  },
  {
    name: "Blackwork",
    slug: "blackwork",
    description: "Bold black ink and tribal patterns",
    heroImage: "https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=600&q=80",
  },
  {
    name: "Fine Line",
    slug: "fine-line",
    description: "Delicate lines and minimalist designs",
    heroImage: "https://images.unsplash.com/photo-1604881991720-f91add269bed?w=600&q=80",
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
                <Link href={`/shops?styles=${style.name}`}>
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
