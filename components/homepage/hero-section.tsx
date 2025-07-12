import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative h-[60vh] min-h-[400px] w-full flex items-center justify-center text-center text-white">
      <div className="absolute inset-0 bg-black/70 z-10" />
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/hero-background-dark.png')",
        }}
      />
      <div className="relative z-20 container mx-auto px-4">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Your Story, Etched in Ink.</h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-gray-300">
          Find visionary artists, explore curated studios, or conjure a unique design with our AI.
        </p>
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center gap-2 bg-black/20 backdrop-blur-sm p-2 rounded-lg border border-white/20">
            <Input
              type="search"
              placeholder="Search for artists, styles, or shops..."
              className="flex-grow bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder:text-gray-400"
            />
            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 transition-shadow hover:shadow-accent-glow"
            >
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
