import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, MapPin, Navigation, Sparkles, Users, Star } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 hero-grid opacity-50" />

      <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-hero-accent/20 to-hero-secondary/20 rounded-full blur-xl animate-float" />
      <div
        className="absolute bottom-20 right-10 w-48 h-48 bg-gradient-to-br from-hero-tertiary/20 to-hero-accent/20 rounded-full blur-xl animate-float"
        style={{ animationDelay: "2s" }}
      />
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-gradient-to-br from-hero-secondary/20 to-hero-tertiary/20 rounded-full blur-xl animate-pulse-slow" />

      <div className="relative z-20 container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-sm text-white/80">
                <Sparkles className="w-4 h-4" />
                <span>Discover Your Perfect Ink</span>
              </div>

              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tight text-white hero-text-glow">
                TATTOO
                <span className="block text-transparent bg-gradient-to-r from-hero-accent via-hero-secondary to-hero-tertiary bg-clip-text">
                  MAPS
                </span>
              </h1>

              <p className="max-w-2xl mx-auto text-xl md:text-2xl text-white/70 leading-relaxed font-light">
                Connect with world-class tattoo artists.
                <br className="hidden md:block" />
                Explore portfolios. Book your next masterpiece.
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="hero-card p-6">
                <div className="flex flex-col lg:flex-row items-center gap-4">
                  <div className="relative flex-grow w-full">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                    <Input
                      type="search"
                      placeholder="Search by location, artist, or style..."
                      className="pl-12 bg-white/5 border-white/20 focus:border-hero-accent text-white placeholder:text-white/50 h-14 text-lg rounded-xl"
                    />
                  </div>
                  <div className="flex gap-3 w-full lg:w-auto">
                    <Button asChild className="hero-button-primary flex-1 lg:flex-none h-14 text-lg">
                      <Link href="/map">
                        <Navigation className="mr-2 h-5 w-5" />
                        Explore Map
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="hero-button-secondary flex-1 lg:flex-none h-14 text-lg bg-transparent"
                    >
                      <Link href="/artists">
                        <Search className="mr-2 h-5 w-5" />
                        Browse Artists
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16">
              <div className="hero-card p-6 text-center group hover:scale-105 transition-transform duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-hero-accent to-hero-secondary rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">10,000+</div>
                <div className="text-white/60">Verified Artists</div>
              </div>

              <div className="hero-card p-6 text-center group hover:scale-105 transition-transform duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-hero-secondary to-hero-tertiary rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">5,000+</div>
                <div className="text-white/60">Studios Worldwide</div>
              </div>

              <div className="hero-card p-6 text-center group hover:scale-105 transition-transform duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-hero-tertiary to-hero-accent rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">4.9/5</div>
                <div className="text-white/60">Average Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
