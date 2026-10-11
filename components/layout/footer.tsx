import Link from "next/link"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="bg-night tex-night border-t-3 border-ink">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Image src="/brand/logo-wordmark-cream.webp" alt="TattooMaps" width={83} height={48} className="h-12 w-auto" />
            </div>
            <p className="text-cream/85 text-sm leading-relaxed">
              Discover tattoo artists and shops across the US through interactive maps. Your journey to the perfect tattoo
              starts here.
            </p>
          </div>

          {/* Discover */}
          <div className="space-y-4">
            <h3 className="font-semibold text-cream">Discover</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/artists" className="text-cream/85 underline-offset-4 hover:underline">
                  Find Artists
                </Link>
              </li>
              <li>
                <Link href="/tattoo-shops" className="text-cream/85 underline-offset-4 hover:underline">
                  Browse Shops
                </Link>
              </li>
              <li>
                <Link href="/styles" className="text-cream/85 underline-offset-4 hover:underline">
                  Tattoo Styles
                </Link>
              </li>
              <li>
                <Link href="/map" className="text-cream/85 underline-offset-4 hover:underline">
                  Map View
                </Link>
              </li>
            </ul>
          </div>

          {/* For Artists */}
          <div className="space-y-4">
            <h3 className="font-semibold text-cream">For Artists</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/artist-dashboard" className="text-cream/85 underline-offset-4 hover:underline">
                  Artist Dashboard
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-cream/85 underline-offset-4 hover:underline">
                  Join as Artist
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-cream/85 underline-offset-4 hover:underline">
                  Pricing Guide
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-semibold text-cream">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/help" className="text-cream/85 underline-offset-4 hover:underline">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-cream/85 underline-offset-4 hover:underline">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-cream/85 underline-offset-4 hover:underline">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-cream/85 underline-offset-4 hover:underline">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-cream/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-cream/85 text-sm">© {new Date().getFullYear()} TattooMaps. All rights reserved.</p>
        </div>
        <p className="text-cream/85 text-sm mt-4 text-center md:text-left">
          Places data from{" "}
          <Link href="/attributions" className="underline-offset-4 hover:underline">
            Overture Maps Foundation, including Foursquare data under Apache 2.0
          </Link>
          .
        </p>
      </div>
    </footer>
  )
}
