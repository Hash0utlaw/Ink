import Link from "next/link"
import { MapPin, Instagram, Twitter, Facebook, Mail } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-secondary border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 bg-accent rounded-lg">
                <MapPin className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="font-extrabold tracking-wide text-lg">TattooMaps</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Discover tattoo artists and shops worldwide through interactive maps. Your journey to the perfect tattoo
              starts here.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="text-muted-foreground hover:text-accent transition-colors">
                <Instagram className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-accent transition-colors">
                <Twitter className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-accent transition-colors">
                <Facebook className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-accent transition-colors">
                <Mail className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Discover */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Discover</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/map" className="text-muted-foreground hover:text-accent transition-colors">
                  Explore Map
                </Link>
              </li>
              <li>
                <Link href="/artists" className="text-muted-foreground hover:text-accent transition-colors">
                  Find Artists
                </Link>
              </li>
              <li>
                <Link href="/shops" className="text-muted-foreground hover:text-accent transition-colors">
                  Browse Shops
                </Link>
              </li>
              <li>
                <Link href="/styles" className="text-muted-foreground hover:text-accent transition-colors">
                  Tattoo Styles
                </Link>
              </li>
              <li>
                <Link href="/generator" className="text-muted-foreground hover:text-accent transition-colors">
                  AI Generator
                </Link>
              </li>
            </ul>
          </div>

          {/* For Artists */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">For Artists</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/artist-dashboard" className="text-muted-foreground hover:text-accent transition-colors">
                  Artist Dashboard
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-muted-foreground hover:text-accent transition-colors">
                  Join as Artist
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-accent transition-colors">
                  Portfolio Tips
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-accent transition-colors">
                  Pricing Guide
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-accent transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-accent transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-accent transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-accent transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">© 2025 TattooMaps. All rights reserved.</p>
          <p className="text-muted-foreground text-sm mt-4 md:mt-0">Built with ❤️ for the global tattoo community</p>
        </div>
      </div>
    </footer>
  )
}
