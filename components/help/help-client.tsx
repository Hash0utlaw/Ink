"use client"

import { useState } from "react"
import { Suspense } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Search,
  MapPin,
  User,
  Calendar,
  CreditCard,
  Shield,
  Palette,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Zap,
  HelpCircle,
} from "lucide-react"

const CATEGORIES = [
  { icon: MapPin, title: "Finding Artists & Shops", description: "Search, filter, and discover artists near you", articles: 8, slug: "finding" },
  { icon: User, title: "Account & Profile", description: "Manage your account, profile settings, and preferences", articles: 6, slug: "account" },
  { icon: Calendar, title: "Bookings & Appointments", description: "How to book, reschedule, or cancel appointments", articles: 7, slug: "bookings" },
  { icon: CreditCard, title: "Payments & Deposits", description: "Deposits, refunds, and payment methods", articles: 5, slug: "payments" },
  { icon: Shield, title: "Safety & Trust", description: "Reviews, verification, and community standards", articles: 4, slug: "safety" },
  { icon: Palette, title: "AI Tattoo Generator", description: "Using the AI design tool, saving, and sharing", articles: 6, slug: "generator" },
]

const FAQS = [
  { question: "How do I find a tattoo artist near me?", answer: "Use the interactive map on our Artists page or the Search page. Enter your city or allow location access, then filter by style, price range, and availability. You can also browse the Shops page to find studios by area." },
  { question: "Is TattooMaps free to use?", answer: "Yes — browsing artists, shops, and styles is completely free for clients. Artists and studios have free and paid listing tiers. The AI Tattoo Generator includes free credits for new users, with additional credits available through a subscription." },
  { question: "How do I book an appointment?", answer: "Visit an artist's profile page and click the Book Appointment button. Select your preferred date, describe your tattoo idea, and confirm the booking. A deposit may be required depending on the artist's policy." },
  { question: "Can I cancel or reschedule a booking?", answer: "Cancellation and reschedule policies are set by each individual artist. Check the artist's profile for their specific policy before booking. Generally, cancellations made 48+ hours in advance are eligible for deposit refunds." },
  { question: "How do I list my studio or artist profile?", answer: "Sign up with an Artist or Studio account via the Join as Artist link. Complete your profile, upload portfolio photos, set your availability, and your listing will go live within 24 hours after a brief review." },
  { question: "How does the AI Tattoo Generator work?", answer: "The generator uses AI to create custom tattoo design concepts based on your description, style preference, and body placement. Describe your idea, choose a style, and receive several design variations you can save, share, or bring to an artist for inspiration." },
  { question: "Are artists on TattooMaps verified?", answer: "Artists complete a profile verification process that includes portfolio review and identity checks. Verified artists display a badge on their profile. We also use community reviews and reports to maintain quality standards." },
  { question: "How do I leave a review for an artist?", answer: "After your appointment is marked complete, you will receive a prompt in your client dashboard to leave a review. Reviews include a star rating and written feedback. All reviews are moderated for authenticity." },
]

const POPULAR_ARTICLES = [
  { title: "How to write a great consultation request", category: "Bookings" },
  { title: "Understanding tattoo deposit policies", category: "Payments" },
  { title: "What to look for in an artist portfolio", category: "Finding" },
  { title: "Aftercare tips to protect your new tattoo", category: "Safety" },
  { title: "Using filters to find your ideal style", category: "Finding" },
  { title: "How to get the most from the AI Generator", category: "Generator" },
]

export function HelpClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const filteredFaqs = FAQS.filter(
    (faq) =>
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 px-4 text-center bg-secondary border-b border-border">
          <div className="container mx-auto max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
              Help Center
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground">
              How can we help you?
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Search our knowledge base or browse topics below to find answers.
            </p>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search articles, FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-13 text-base bg-background border-border focus:border-accent/60 rounded-xl"
              />
            </div>
          </div>
        </section>

        {/* Browse Categories */}
        {!searchQuery && (
          <section className="py-16 px-4">
            <div className="container mx-auto max-w-6xl">
              <h2 className="text-2xl font-bold mb-8">Browse by Topic</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  return (
                    <Card key={cat.slug} className="group hover:border-accent/40 transition-all duration-200 cursor-pointer bg-card">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                            <Icon className="w-5 h-5 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors mb-1">{cat.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{cat.description}</p>
                            <span className="text-xs text-muted-foreground">{cat.articles} articles</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className={`py-16 px-4 ${!searchQuery ? "bg-muted/30 border-t border-border" : ""}`}>
          <div className="container mx-auto max-w-3xl">
            <div className="flex items-center gap-3 mb-8">
              <BookOpen className="w-6 h-6 text-accent" />
              <h2 className="text-2xl font-bold">
                {searchQuery ? `Results for "${searchQuery}"` : "Frequently Asked Questions"}
              </h2>
            </div>

            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">No articles found for that search.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try different keywords or{" "}
                  <Link href="/contact" className="text-accent hover:underline">contact our support team</Link>.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFaqs.map((faq, i) => (
                  <div key={i} className="border border-border rounded-xl overflow-hidden bg-card">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      aria-expanded={openFaq === i}
                    >
                      <span className="font-medium text-foreground pr-4">{faq.question}</span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} />
                    </button>
                    {openFaq === i && (
                      <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-4">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Popular Articles */}
        {!searchQuery && (
          <section className="py-16 px-4">
            <div className="container mx-auto max-w-6xl">
              <div className="flex items-center gap-3 mb-8">
                <Zap className="w-6 h-6 text-accent" />
                <h2 className="text-2xl font-bold">Popular Articles</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {POPULAR_ARTICLES.map((article, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-accent/40 transition-colors cursor-pointer group">
                    <div className="w-8 h-8 bg-accent/10 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors leading-relaxed">{article.title}</p>
                      <span className="text-xs text-muted-foreground mt-1 block">{article.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Still need help CTA */}
        <section className="py-16 px-4 bg-muted/30 border-t border-border">
          <div className="container mx-auto max-w-2xl text-center">
            <MessageCircle className="w-10 h-10 text-accent mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Still need help?</h2>
            <p className="text-muted-foreground mb-6">Our support team is available Monday through Friday, 9am – 6pm EST.</p>
            <Link href="/contact" className="inline-flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-6 py-3 rounded-xl transition-colors">
              <MessageCircle className="w-4 h-4" />
              Contact Support
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
