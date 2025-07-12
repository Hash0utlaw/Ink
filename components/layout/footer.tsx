import Link from "next/link"
import { Droplet, Twitter, Instagram, Facebook } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center space-x-2">
              <Droplet className="h-6 w-6 text-accent" />
              <span className="font-bold text-lg">Inkfinder</span>
            </Link>
            <p className="text-muted-foreground">Where Art Meets Skin.</p>
            <div className="flex gap-4 mt-2">
              <Link href="#" className="text-muted-foreground hover:text-accent">
                <Twitter />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-accent">
                <Instagram />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-accent">
                <Facebook />
              </Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/generator" className="text-muted-foreground hover:text-accent">
                  AI Generator
                </Link>
              </li>
              <li>
                <Link href="/artists" className="text-muted-foreground hover:text-accent">
                  Find Artists
                </Link>
              </li>
              <li>
                <Link href="/shops" className="text-muted-foreground hover:text-accent">
                  Find Shops
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/blog" className="text-muted-foreground hover:text-accent">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-muted-foreground hover:text-accent">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-muted-foreground hover:text-accent">
                  Support
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-accent">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-accent">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-border/40 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} Inkfinder. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
