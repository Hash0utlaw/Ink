import { Suspense } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, ArrowRight, Mail } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service - TattooMaps",
  description: "The terms and conditions governing your use of the TattooMaps platform.",
}

const SECTIONS = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "eligibility", title: "Eligibility" },
  { id: "accounts", title: "User Accounts" },
  { id: "platform-use", title: "Permitted Use" },
  { id: "artist-terms", title: "Artist-Specific Terms" },
  { id: "bookings-payments", title: "Bookings & Payments" },
  { id: "content", title: "User Content" },
  { id: "intellectual-property", title: "Intellectual Property" },
  { id: "disclaimers", title: "Disclaimers" },
  { id: "limitation", title: "Limitation of Liability" },
  { id: "termination", title: "Termination" },
  { id: "governing-law", title: "Governing Law" },
  { id: "contact", title: "Contact" },
]

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 px-4 text-center border-b border-border/50">
          <div className="container mx-auto max-w-2xl">
            <Badge variant="secondary" className="mb-4 gap-2">
              <FileText className="w-3.5 h-3.5" />
              Legal
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-balance">
              Terms of Service
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Last updated: <span className="text-foreground font-medium">June 1, 2025</span>
            </p>
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed max-w-xl mx-auto">
              Please read these Terms of Service carefully before using TattooMaps. By accessing or using our platform, you agree to be bound by these terms.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="grid lg:grid-cols-4 gap-12">
              {/* Table of Contents */}
              <aside className="hidden lg:block">
                <div className="sticky top-24">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">On this page</p>
                  <nav className="space-y-1">
                    {SECTIONS.map((s) => (
                      <a
                        key={s.id}
                        href={`#${s.id}`}
                        className="block text-sm text-muted-foreground hover:text-accent transition-colors py-1 border-l-2 border-transparent hover:border-accent pl-3"
                      >
                        {s.title}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>

              {/* Body */}
              <div className="lg:col-span-3 space-y-12">
                <div className="p-5 bg-accent/10 border border-accent/20 rounded-xl text-sm leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-accent">Summary: </span>
                  TattooMaps is a platform connecting tattoo clients with artists and shops. You must be 18+ to use the service. Artists are independent contractors — TattooMaps is not responsible for the quality of tattoo services. Use the platform lawfully and respectfully.
                </div>

                <div id="acceptance" className="space-y-4">
                  <h2 className="text-xl font-bold">1. Acceptance of Terms</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    By accessing or using TattooMaps (the &quot;Platform&quot;), including our website, mobile applications, and related services (collectively, the &quot;Services&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;) and our Privacy Policy. If you do not agree to these Terms, you may not use the Platform. These Terms constitute a legally binding agreement between you and TattooMaps, Inc. (&quot;TattooMaps&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;).
                  </p>
                </div>

                <div id="eligibility" className="space-y-4">
                  <h2 className="text-xl font-bold">2. Eligibility</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    You must be at least 18 years of age to use TattooMaps. Tattoos are a permanent body modification, and we do not permit minors to register or use any part of our platform, including the AI generator or booking features. By creating an account, you represent and warrant that you are 18 years of age or older and have the legal capacity to enter into these Terms.
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    You also represent that you are not barred from using the Services under the laws of the United States or any other jurisdiction.
                  </p>
                </div>

                <div id="accounts" className="space-y-4">
                  <h2 className="text-xl font-bold">3. User Accounts</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    To access certain features, you must register for an account. You agree to:
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm leading-relaxed list-disc list-inside">
                    <li>Provide accurate, current, and complete information during registration.</li>
                    <li>Maintain and promptly update your account information.</li>
                    <li>Keep your password confidential and not share it with third parties.</li>
                    <li>Notify us immediately at support@tattoomaps.com of any unauthorized use of your account.</li>
                    <li>Be responsible for all activity that occurs under your account.</li>
                  </ul>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    TattooMaps reserves the right to suspend or terminate accounts that contain inaccurate information or violate these Terms.
                  </p>
                </div>

                <div id="platform-use" className="space-y-4">
                  <h2 className="text-xl font-bold">4. Permitted Use</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">You agree to use TattooMaps only for lawful purposes and in accordance with these Terms. You agree not to:</p>
                  <ul className="space-y-2 text-muted-foreground text-sm leading-relaxed list-disc list-inside">
                    <li>Use the platform for any illegal or unauthorized purpose.</li>
                    <li>Post false, misleading, or fraudulent content, reviews, or artist listings.</li>
                    <li>Harass, abuse, threaten, or intimidate other users or artists.</li>
                    <li>Scrape, crawl, or extract data from the platform without express written permission.</li>
                    <li>Attempt to gain unauthorized access to any part of the platform or its systems.</li>
                    <li>Upload viruses, malware, or any other malicious code.</li>
                    <li>Use the AI generator to create content that is illegal, hateful, or sexually explicit.</li>
                    <li>Circumvent payment systems or arrange off-platform bookings for deposits already facilitated through TattooMaps.</li>
                    <li>Impersonate another person or entity, including TattooMaps staff.</li>
                  </ul>
                </div>

                <div id="artist-terms" className="space-y-4">
                  <h2 className="text-xl font-bold">5. Artist-Specific Terms</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Artists who register on TattooMaps are independent contractors, not employees, agents, or partners of TattooMaps. By registering as an artist, you represent that:
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm leading-relaxed list-disc list-inside">
                    <li>You hold all required licenses, permits, and certifications to practice tattooing in your jurisdiction.</li>
                    <li>All portfolio images you upload are your original work or you have the right to display them.</li>
                    <li>Your availability, pricing, and cancellation policies listed on the platform are accurate.</li>
                    <li>You will conduct appointments in a safe, professional, and hygienic manner.</li>
                    <li>You are solely responsible for the tattoo services you provide, including outcomes and safety.</li>
                  </ul>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    TattooMaps does not guarantee any bookings, earnings, or client volume for artist accounts.
                  </p>
                </div>

                <div id="bookings-payments" className="space-y-4">
                  <h2 className="text-xl font-bold">6. Bookings & Payments</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    TattooMaps facilitates the booking process and deposit collection between clients and artists. By using our booking features:
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm leading-relaxed list-disc list-inside">
                    <li>Deposits are processed through Stripe and are governed by Stripe&apos;s Terms of Service.</li>
                    <li>Refund eligibility is determined by the individual artist&apos;s stated cancellation policy.</li>
                    <li>TattooMaps does not process or control the full payment for tattoo services — only deposits facilitated through the platform.</li>
                    <li>TattooMaps is not liable for any disputes between clients and artists regarding service quality, outcomes, or pricing.</li>
                    <li>Chargebacks initiated without first contacting the artist and TattooMaps support may result in account suspension.</li>
                  </ul>
                </div>

                <div id="content" className="space-y-4">
                  <h2 className="text-xl font-bold">7. User Content</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    &quot;User Content&quot; means any content you submit to the platform, including reviews, messages, portfolio images, design prompts, and profile information. By submitting User Content, you:
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm leading-relaxed list-disc list-inside">
                    <li>Grant TattooMaps a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content in connection with operating the platform.</li>
                    <li>Represent that you own or have the necessary rights to submit the content.</li>
                    <li>Confirm the content does not infringe any third-party intellectual property rights.</li>
                    <li>Understand that TattooMaps may remove content that violates these Terms or our community guidelines.</li>
                  </ul>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    TattooMaps does not claim ownership of your content. Reviews and messages remain the property of their authors.
                  </p>
                </div>

                <div id="intellectual-property" className="space-y-4">
                  <h2 className="text-xl font-bold">8. Intellectual Property</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    The TattooMaps platform, including its design, software, trademarks, and non-user-generated content, is owned by TattooMaps, Inc. and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works from our platform without express written permission.
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    AI-generated designs created using our generator are provided for personal, inspirational use only. Ownership and copyright of AI-generated outputs are subject to applicable law, which is evolving. You are responsible for ensuring any design you use commercially complies with intellectual property laws in your jurisdiction.
                  </p>
                </div>

                <div id="disclaimers" className="space-y-4">
                  <h2 className="text-xl font-bold">9. Disclaimers</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. TATTOOMAPS DOES NOT WARRANT THAT:
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm leading-relaxed list-disc list-inside">
                    <li>The platform will be uninterrupted, error-free, or secure.</li>
                    <li>Any artist, shop, or review on the platform is accurate or verified.</li>
                    <li>AI-generated designs will meet your expectations or be suitable for tattooing.</li>
                    <li>The platform will meet your specific requirements.</li>
                  </ul>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    TattooMaps is a marketplace platform. We are not responsible for the quality, safety, or outcome of any tattoo service arranged through the platform.
                  </p>
                </div>

                <div id="limitation" className="space-y-4">
                  <h2 className="text-xl font-bold">10. Limitation of Liability</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, TATTOOMAPS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING FROM YOUR USE OF OR INABILITY TO USE THE PLATFORM OR ITS SERVICES.
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    IN NO EVENT SHALL TATTOOMAPS&apos;S TOTAL LIABILITY TO YOU EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO TATTOOMAPS IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) $100 USD.
                  </p>
                </div>

                <div id="termination" className="space-y-4">
                  <h2 className="text-xl font-bold">11. Termination</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    TattooMaps may suspend or terminate your account at any time, with or without notice, for conduct that violates these Terms, is harmful to other users, artists, or TattooMaps, or for any other reason at our sole discretion.
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    You may delete your account at any time from your Dashboard settings. Upon termination, your right to access the platform ceases immediately. Provisions that by their nature should survive termination will survive, including intellectual property rights, disclaimers, and limitations of liability.
                  </p>
                </div>

                <div id="governing-law" className="space-y-4">
                  <h2 className="text-xl font-bold">12. Governing Law & Disputes</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    These Terms are governed by the laws of the State of New York, United States, without regard to its conflict of law provisions. Any disputes arising from or relating to these Terms or the platform shall be resolved through binding arbitration in New York, NY, except that either party may seek injunctive or other equitable relief in a court of competent jurisdiction.
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    You agree to resolve disputes individually and waive any right to participate in class action lawsuits or class-wide arbitration.
                  </p>
                </div>

                <div id="contact" className="space-y-4">
                  <h2 className="text-xl font-bold">13. Contact</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    If you have questions about these Terms of Service, please contact us:
                  </p>
                  <div className="p-5 bg-card border border-border/60 rounded-xl space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-accent" />
                      <span className="text-muted-foreground">Legal: <span className="text-accent">legal@tattoomaps.com</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-accent" />
                      <span className="text-muted-foreground">TattooMaps, Inc. — New York, NY</span>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button asChild>
                      <Link href="/support/contact">
                        Contact Support
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="bg-transparent">
                      <Link href="/support/privacy">
                        Privacy Policy
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
