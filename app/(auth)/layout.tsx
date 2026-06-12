import type React from "react"
import Link from "next/link"
import { MapPin, Users, Star, Palette } from "lucide-react"

const STYLE_IMAGES = [
  { src: "/styles/heroes/japanese-hero.png", label: "Japanese" },
  { src: "/styles/heroes/watercolor-hero.png", label: "Watercolor" },
  { src: "/styles/heroes/geometric-hero.png", label: "Geometric" },
  { src: "/styles/heroes/realism-hero.png", label: "Realism" },
  { src: "/styles/heroes/blackwork-hero.png", label: "Blackwork" },
  { src: "/styles/heroes/fine-line-hero.png", label: "Fine Line" },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Left brand panel (hidden on mobile) ───────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 hero-grid opacity-40" />

        {/* Ambient glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-[hsl(var(--hero-accent))]/15 rounded-full blur-3xl" />

        {/* Image mosaic */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-1 p-1 opacity-30">
          {STYLE_IMAGES.map((img) => (
            <div key={img.src} className="relative overflow-hidden">
              <img
                src={img.src}
                alt={img.label}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Dark overlay over mosaic */}
        <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/70 to-background/85" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 w-fit">
            <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/30">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">TattooMaps</span>
          </Link>

          {/* Hero copy */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-foreground leading-tight">
                Find Your Next
                <span className="block text-transparent bg-gradient-to-r from-accent via-[hsl(var(--hero-accent))] to-[hsl(var(--hero-secondary))] bg-clip-text">
                  Masterpiece
                </span>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                Connect with world-class tattoo artists, explore thousands of styles, and book your perfect ink — all in one place.
              </p>
            </div>

            {/* Feature bullets */}
            <ul className="space-y-3">
              {[
                { icon: Users, text: "10,000+ verified artists worldwide" },
                { icon: MapPin, text: "Interactive map to find shops near you" },
                { icon: Palette, text: "20+ tattoo styles to browse and explore" },
                { icon: Star, text: "Trusted by over 500,000 ink enthusiasts" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-accent" />
                  </div>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom stats bar */}
          <div className="flex items-center gap-8">
            <div>
              <div className="text-2xl font-bold text-foreground">10K+</div>
              <div className="text-xs text-muted-foreground">Artists</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <div className="text-2xl font-bold text-foreground">5K+</div>
              <div className="text-xs text-muted-foreground">Studios</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <div className="text-2xl font-bold text-foreground">4.9★</div>
              <div className="text-xs text-muted-foreground">Avg. rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen bg-background lg:bg-secondary/30">
        {/* Mobile-only top bar */}
        <div className="lg:hidden flex items-center justify-between p-5 border-b border-border/40">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">TattooMaps</span>
          </Link>
        </div>

        {/* Form content */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
          {children}
        </div>

        {/* Bottom links */}
        <div className="p-6 text-center border-t border-border/20">
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link href="/support/terms" className="underline hover:text-foreground transition-colors">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/support/privacy" className="underline hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
