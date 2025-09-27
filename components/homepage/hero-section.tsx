import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, MapPin, Navigation } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative h-[70vh] min-h-[500px] w-full flex items-center justify-center text-center text-white">
      <div className="absolute inset-0 bg-black/70 z-10" />
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/tattoomaps-hero-background.jpg')",
        }}
      />
      <div className="relative z-20 container mx-auto px-4">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-accent rounded-xl">
            <MapPin className="w-7 h-7 text-accent-foreground" />
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">TattooMaps</h1>
        </div>
        <p className="mt-4 max-w-3xl mx-auto text-xl md:text-2xl text-gray-300 leading-relaxed">
          Discover tattoo artists and shops worldwide through interactive maps.
          <br className="hidden md:block" />
          Find your perfect artist, explore styles, and book appointments near you.
        </p>
        <div className="mt-10 max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-white/20">
            <div className="relative flex-grow w-full">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Search by location, artist, or style..."
                className="pl-10 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder:text-gray-400 h-12"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                asChild
                size="lg"
                className="flex-1 sm:flex-none bg-accent text-accent-foreground hover:bg-accent/90 transition-all hover:shadow-accent-glow h-12"
              >
                <Link href="/map">
                  <Navigation className="mr-2 h-5 w-5" />
                  Explore Map
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="flex-1 sm:flex-none border-white/30 text-white hover:bg-white/10 h-12 bg-transparent"
              >
                <Link href="/artists">
                  <Search className="mr-2 h-5 w-5" />
                  Search
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>10,000+ Artists</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>5,000+ Shops</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span>50+ Countries</span>
          </div>
        </div>
      </div>
    </section>
  )
}
