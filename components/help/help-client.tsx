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
  Send,
  Shield,
  MessageCircle,
  ChevronDown,
  BookOpen,
  HelpCircle,
} from "lucide-react"

type TopicSlug = "finding" | "requests" | "account" | "safety"

// Each card jumps to its questions below (#topic-<slug>).
const CATEGORIES: { icon: typeof MapPin; title: string; description: string; slug: TopicSlug }[] = [
  { icon: MapPin, title: "Finding Artists & Shops", description: "Search, filter, and discover artists near you", slug: "finding" },
  { icon: Send, title: "Requests", description: "Getting in touch with an artist and what happens next", slug: "requests" },
  { icon: User, title: "Account & Profile", description: "Your account, saved artists and shops, and claiming your page", slug: "account" },
  { icon: Shield, title: "Safety & Trust", description: "How reviews and ratings work", slug: "safety" },
]

const FAQS: { topic: TopicSlug; question: string; answer: string }[] = [
  { topic: "finding", question: "How do I find a tattoo artist near me?", answer: "Search by city, state or ZIP code on the homepage, or open the Artists or Shops page and filter by name, place, style and minimum rating. The map shows the shops and artists in the area you're looking at, and you can use your location to see what's nearby." },
  { topic: "finding", question: "Is TattooMaps free to use?", answer: "Yes. Searching, browsing profiles, saving artists and shops, and sending requests are free. Listings are free." },
  { topic: "requests", question: "How do I get in touch with an artist?", answer: "Open the artist's page and send a request with your idea. If the artist manages their page on TattooMaps, the request goes straight to them. Otherwise we pass it on to their shop and email you if they pick it up. Scheduling and pricing are arranged directly with the artist or shop." },
  { topic: "requests", question: "Can I change or cancel a request?", answer: "TattooMaps passes your request on but doesn't schedule appointments. To change or cancel, contact the artist or shop directly, using the details on their page." },
  { topic: "account", question: "How do I save artists and shops?", answer: "Sign in, then use Save on an artist's or shop's page. Everything you save is listed under Favorites in your dashboard." },
  { topic: "account", question: "How do I list my studio or artist profile?", answer: "Most shops and artists are already listed. If you claim your page, we review it by hand, usually within 1–2 business days." },
  { topic: "safety", question: "How do I leave a review for an artist?", answer: "Reviews are tied to requests sent through TattooMaps. When the artist marks your session as complete, we email you a link to rate it from 1 to 5 stars and add an optional written review. Each request can be reviewed once. Ratings combine public business listings and reviews from TattooMaps clients." },
]

function FaqItem({ question, answer, open, onToggle }: { question: string; answer: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="border border-border rounded overflow-hidden bg-vellum tex-vellum">
      <button
        type="button"
        className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="font-medium text-foreground pr-4">{question}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-4">
          {answer}
        </div>
      )}
    </div>
  )
}

export function HelpClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const [openFaq, setOpenFaq] = useState<string | null>(null)

  const filteredFaqs = FAQS.filter(
    (faq) =>
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="flex min-h-screen flex-col bg-paper tex-paper">
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
                className="pl-12 h-13 text-base bg-background border-border focus:border-ink rounded"
              />
            </div>
          </div>
        </section>

        {/* Browse Categories */}
        {!searchQuery && (
          <section className="py-16 px-4">
            <div className="container mx-auto max-w-6xl">
              <h2 className="text-2xl font-bold mb-8">Browse by Topic</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  return (
                    <a
                      key={cat.slug}
                      href={`#topic-${cat.slug}`}
                      className="block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Card className="h-full bg-vellum tex-vellum hover:border-ink">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-secondary rounded flex items-center justify-center shrink-0">
                              <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground mb-1">{cat.title}</h3>
                              <p className="text-sm text-muted-foreground leading-relaxed">{cat.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
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
              <BookOpen className="w-6 h-6 text-primary" />
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
                  <Link href="/contact" className="text-navy hover:underline">contact our support team</Link>.
                </p>
              </div>
            ) : (
              // Searching shows one list; otherwise the questions are grouped under
              // their topics so the cards above can jump to them.
              <div className="space-y-10">
                {(searchQuery ? [{ slug: null, title: null }] : CATEGORIES).map((topic) => {
                  const faqs = topic.slug ? filteredFaqs.filter((faq) => faq.topic === topic.slug) : filteredFaqs
                  return (
                    <div key={topic.slug ?? "results"} id={topic.slug ? `topic-${topic.slug}` : undefined} className="scroll-mt-24">
                      {topic.title && <h3 className="mb-3 text-lg font-semibold text-foreground">{topic.title}</h3>}
                      <div className="space-y-3">
                        {faqs.map((faq) => (
                          <FaqItem
                            key={faq.question}
                            question={faq.question}
                            answer={faq.answer}
                            open={openFaq === faq.question}
                            onToggle={() => setOpenFaq(openFaq === faq.question ? null : faq.question)}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Still need help CTA */}
        <section className="py-16 px-4 bg-muted/30 border-t border-border">
          <div className="container mx-auto max-w-2xl text-center">
            <MessageCircle className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Still need help?</h2>
            <p className="text-muted-foreground mb-6">Our support team is available Monday through Friday, 9am – 6pm EST.</p>
            <Link href="/contact" className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 py-3 rounded transition-colors">
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
