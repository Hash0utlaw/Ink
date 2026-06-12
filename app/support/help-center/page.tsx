"use client"

import { useState } from "react"
import { Suspense } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Search,
  BookOpen,
  MapPin,
  Users,
  Calendar,
  Palette,
  CreditCard,
  Shield,
  MessageCircle,
  ArrowRight,
  LifeBuoy,
  Zap,
} from "lucide-react"

const CATEGORIES = [
  {
    icon: MapPin,
    title: "Finding Artists & Shops",
    description: "Search, filter, and discover talent near you",
    count: 8,
    id: "finding",
  },
  {
    icon: Calendar,
    title: "Bookings & Appointments",
    description: "How to book, reschedule, and cancel",
    count: 6,
    id: "bookings",
  },
  {
    icon: Users,
    title: "Account & Profile",
    description: "Managing your account settings and profile",
    count: 7,
    id: "account",
  },
  {
    icon: Palette,
    title: "AI Tattoo Generator",
    description: "Creating and saving AI-generated designs",
    count: 5,
    id: "generator",
  },
  {
    icon: CreditCard,
    title: "Payments & Billing",
    description: "Deposits, refunds, and payment methods",
    count: 6,
    id: "payments",
  },
  {
    icon: Shield,
    title: "Safety & Trust",
    description: "Reporting, reviews, and community guidelines",
    count: 4,
    id: "safety",
  },
]

const FAQS: Record<string, { q: string; a: string }[]> = {
  finding: [
    {
      q: "How do I search for tattoo artists near me?",
      a: "Use the Map page to view artists and shops plotted on an interactive map. You can enter your city or enable location access, then filter by style, rating, and availability. The Artists page also offers a list view with advanced filters.",
    },
    {
      q: "Can I filter artists by tattoo style?",
      a: "Yes. On both the Artists and Map pages you can filter by style — including Traditional, Fine Line, Japanese, Watercolor, Geometric, Blackwork, Realism, and more. You can combine multiple style filters at once.",
    },
    {
      q: "How do I view an artist's full portfolio?",
      a: "Click on any artist card to open their profile page. The Portfolio tab shows all their uploaded work. You can zoom into individual pieces and filter the portfolio by style.",
    },
    {
      q: "Are all artists on TattooMaps verified?",
      a: "Artists self-register and upload their work. We display verified badges on profiles that have completed our ID and license verification process. Always review an artist's portfolio, ratings, and reviews before booking.",
    },
    {
      q: "How do I save an artist to my favorites?",
      a: "When viewing an artist's profile, click the heart icon in the header. Saved artists appear in your Dashboard under the Favorites tab for quick access later.",
    },
    {
      q: "Can I compare multiple artists side by side?",
      a: "Currently you can open artist profiles in separate browser tabs to compare them. A dedicated comparison feature is on our roadmap.",
    },
    {
      q: "How do I find shops in a specific neighborhood?",
      a: "Use the Map page and zoom into the neighborhood you want. Shop pins are shown in a distinct color. You can also search by city or ZIP code in the search bar and filter to show shops only.",
    },
    {
      q: "What does the 'Open Now' filter do?",
      a: "The Open Now filter shows only artists and shops that have marked themselves as available or operating at the current time. Hours are set by the artist or shop and may not always be up to date.",
    },
  ],
  bookings: [
    {
      q: "How do I book an appointment?",
      a: "On any artist profile, navigate to the Booking tab. Select your preferred date and time from the available slots, describe your tattoo idea in the notes field, and submit. The artist will confirm or suggest an alternative time.",
    },
    {
      q: "Is a deposit required to book?",
      a: "Deposit requirements are set by each individual artist. The booking form will display any deposit amount before you confirm. Deposits are typically applied toward the total cost of your tattoo.",
    },
    {
      q: "Can I reschedule my appointment?",
      a: "Yes. Go to Dashboard > Appointments and click the reschedule option on your booking. Rescheduling policies (notice period, fees) vary by artist and are shown on their profile.",
    },
    {
      q: "How do I cancel an appointment?",
      a: "Go to Dashboard > Appointments and click Cancel on the relevant booking. Review the artist's cancellation policy before confirming — some deposits may be non-refundable within a certain window.",
    },
    {
      q: "What happens after I submit a booking request?",
      a: "The artist receives a notification and has 48 hours to confirm or decline. You will receive an email once they respond. If they do not respond within 48 hours, the request expires automatically.",
    },
    {
      q: "Can I message an artist before booking?",
      a: "Yes. On any artist profile there is a Message button. Use it to discuss your design idea, get a quote, or ask questions before committing to a booking.",
    },
  ],
  account: [
    {
      q: "How do I create a TattooMaps account?",
      a: "Click Sign Up in the navigation header. Enter your email and choose a password. You can sign up as a regular user to browse and book, or as an artist to list your services.",
    },
    {
      q: "I forgot my password. How do I reset it?",
      a: "On the Login page, click Forgot Password. Enter your email address and we will send you a reset link. The link is valid for 24 hours.",
    },
    {
      q: "How do I update my profile photo and bio?",
      a: "Go to Dashboard > Profile. Click Edit Profile to update your display name, bio, location, and avatar. Changes are saved immediately.",
    },
    {
      q: "How do I change my email address?",
      a: "Go to Dashboard > Profile > Account Settings. Enter your new email address and confirm your current password. A verification email will be sent to the new address.",
    },
    {
      q: "Can I have both a user account and an artist account?",
      a: "Yes. You can upgrade any account to an artist account from Dashboard > Profile > Become an Artist. Both modes are accessible from the same login.",
    },
    {
      q: "How do I delete my account?",
      a: "Go to Dashboard > Profile > Account Settings and scroll to the Danger Zone section. Account deletion is permanent and removes all your data, bookings, and saved favorites. Contact support if you need help.",
    },
    {
      q: "How do I turn off email notifications?",
      a: "Go to Dashboard > Profile > Notifications. You can individually toggle booking confirmations, messages, promotional emails, and weekly digest emails.",
    },
  ],
  generator: [
    {
      q: "How does the AI Tattoo Generator work?",
      a: "Describe your tattoo idea in the prompt field, select a style, choose a body placement, and click Generate. Our AI creates a set of design variations based on your inputs. The more detail you provide, the better the results.",
    },
    {
      q: "How do I save a generated design?",
      a: "After generating, click the Save button beneath any design you like. Saved designs appear in Dashboard > My Designs. You can download them as PNG files or share them with an artist when booking.",
    },
    {
      q: "Can I use a generated design as a reference for my tattoo?",
      a: "Absolutely. Generated designs are meant to serve as inspiration and reference material. Share them with your chosen artist during the consultation or attach them when submitting a booking request.",
    },
    {
      q: "Are there any limits on how many designs I can generate?",
      a: "Free accounts can generate up to 5 designs per day. There are no limits on saving previously generated designs.",
    },
    {
      q: "The generated design does not look like what I described. What can I do?",
      a: "Try being more specific in your description. Include details like subject matter, color palette, line weight, and cultural references. Using the Style and Body Placement selectors also significantly improves accuracy.",
    },
  ],
  payments: [
    {
      q: "What payment methods are accepted?",
      a: "TattooMaps accepts all major credit and debit cards (Visa, Mastercard, Amex, Discover) for deposits processed through the platform. Some artists may also accept cash on the day of the appointment.",
    },
    {
      q: "Is my payment information secure?",
      a: "Yes. All payments are processed by Stripe, a PCI DSS Level 1 certified payment processor. TattooMaps never stores your full card details.",
    },
    {
      q: "When is my deposit charged?",
      a: "Deposits are charged immediately when you confirm a booking request and the artist accepts. You will receive a receipt by email.",
    },
    {
      q: "How do refunds work?",
      a: "Refund eligibility depends on the artist's cancellation policy, which is displayed on their profile. If a refund is approved, it is returned to your original payment method within 5-10 business days.",
    },
    {
      q: "Do I pay the full tattoo cost through TattooMaps?",
      a: "Currently only deposits are processed through TattooMaps. The remaining balance is settled directly with the artist on the day of your appointment.",
    },
    {
      q: "What if I have a billing dispute?",
      a: "Contact our support team via the Contact Us page. Please include your booking reference number and a description of the issue. We aim to resolve disputes within 3-5 business days.",
    },
  ],
  safety: [
    {
      q: "How do I report an artist or inappropriate content?",
      a: "On any artist profile or piece of content, click the three-dot menu and select Report. Choose the reason and add any additional context. Our moderation team reviews all reports within 24 hours.",
    },
    {
      q: "How are reviews moderated?",
      a: "Reviews can only be left by users who have completed a verified booking through TattooMaps. We use automated and manual checks to flag reviews that violate our content guidelines.",
    },
    {
      q: "What should I do if I feel unsafe during an appointment?",
      a: "Your safety is the top priority. Leave the situation immediately if you feel unsafe. You can report the incident through our Contact Us page. We take all safety reports seriously and investigate them thoroughly.",
    },
    {
      q: "Are background checks performed on artists?",
      a: "TattooMaps performs ID verification on artist accounts but does not conduct criminal background checks. We strongly encourage you to meet your artist for a consultation before your first appointment.",
    },
  ],
}

export default function HelpCenterPage() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("finding")

  const activeFaqs = FAQS[activeCategory] ?? []
  const filteredFaqs = search.trim()
    ? Object.values(FAQS)
        .flat()
        .filter(
          (f) =>
            f.q.toLowerCase().includes(search.toLowerCase()) ||
            f.a.toLowerCase().includes(search.toLowerCase()),
        )
    : activeFaqs

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 px-4 text-center border-b border-border/50">
          <div className="container mx-auto max-w-3xl">
            <Badge variant="secondary" className="mb-4 gap-2">
              <LifeBuoy className="w-3.5 h-3.5" />
              Help Center
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-balance">
              How can we help you?
            </h1>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Find answers to common questions about finding artists, managing bookings, and using TattooMaps.
            </p>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search for answers..."
                className="pl-11 h-12 bg-card border-border/60"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Categories */}
        {!search.trim() && (
          <section className="py-12 px-4 bg-muted/20 border-b border-border/50">
            <div className="container mx-auto max-w-5xl">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  const isActive = activeCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all duration-200 ${
                        isActive
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border/50 bg-card hover:border-accent/30 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="text-xs font-medium leading-tight">{cat.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"}`}>
                        {cat.count} articles
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* FAQ Content */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-3xl">
            {search.trim() && (
              <div className="flex items-center gap-2 mb-8">
                <Search className="w-4 h-4 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">
                  {filteredFaqs.length} result{filteredFaqs.length !== 1 ? "s" : ""} for{" "}
                  <span className="text-foreground font-medium">&quot;{search}&quot;</span>
                </p>
              </div>
            )}

            {!search.trim() && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-1">
                  {CATEGORIES.find((c) => c.id === activeCategory)?.title}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {CATEGORIES.find((c) => c.id === activeCategory)?.description}
                </p>
              </div>
            )}

            {filteredFaqs.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-muted-foreground">No results found. Try a different search term.</p>
                <Button
                  variant="outline"
                  className="mt-4 bg-transparent"
                  onClick={() => setSearch("")}
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-2">
                {filteredFaqs.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`item-${i}`}
                    className="border border-border/60 rounded-xl px-5 bg-card"
                  >
                    <AccordionTrigger className="text-left font-medium hover:no-underline py-5 text-sm">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-5">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </section>

        {/* Still need help CTA */}
        <section className="py-16 px-4 bg-muted/30 border-t border-border/50">
          <div className="container mx-auto max-w-2xl text-center">
            <MessageCircle className="w-10 h-10 text-accent mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Still have questions?</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Our support team is available Monday through Friday, 9am – 6pm EST. We typically respond within a few hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link href="/support/contact">
                  Contact Support
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="bg-transparent">
                <Link href="/support/contact">
                  <Zap className="w-4 h-4 mr-2" />
                  Send a Message
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
