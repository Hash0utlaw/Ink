import { Suspense } from "react"
import Link from "next/link"
import type { Metadata } from "next"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Badge } from "@/components/ui/badge"
import { FileText, Mail, ChevronRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Terms of Service | TattooMaps",
  description: "Read the Terms of Service that govern your use of the TattooMaps platform.",
}

const SECTIONS = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "eligibility", title: "Eligibility" },
  { id: "accounts", title: "Accounts" },
  { id: "platform-use", title: "Use of the Platform" },
  { id: "artist-terms", title: "Artist & Studio Terms" },
  { id: "bookings", title: "Bookings & Payments" },
  { id: "ai-generator", title: "AI Tattoo Generator" },
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
        <section className="py-16 px-4 bg-secondary border-b border-border">
          <div className="container mx-auto max-w-4xl">
            <Badge variant="secondary" className="mb-4">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Legal
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-foreground">Terms of Service</h1>
            <p className="text-muted-foreground">
              Last updated: <span className="text-foreground font-medium">June 1, 2025</span>
            </p>
          </div>
        </section>

        <div className="container mx-auto max-w-6xl px-4 py-12">
          <div className="grid lg:grid-cols-4 gap-10">
            {/* Sticky table of contents */}
            <aside className="hidden lg:block">
              <nav className="sticky top-24 space-y-1" aria-label="Terms of service sections">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">On this page</p>
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors py-1 group"
                  >
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                    {s.title}
                  </a>
                ))}
              </nav>
            </aside>

            {/* Content */}
            <article className="lg:col-span-3 space-y-10 text-foreground">
              <div className="p-5 bg-muted/40 rounded-xl border border-border/60 text-sm text-muted-foreground leading-relaxed">
                Please read these Terms of Service (&quot;Terms&quot;) carefully before using TattooMaps. By accessing or using TattooMaps you agree to be bound by these Terms. If you do not agree, do not use the platform.
              </div>

              <Section id="acceptance" title="1. Acceptance of Terms">
                <Prose>
                  These Terms constitute a legally binding agreement between you and TattooMaps, Inc. (&quot;TattooMaps&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). They govern your access to and use of tattoomaps.com, our mobile applications, and any related services (collectively, the &quot;Platform&quot;). By creating an account or using any feature of the Platform you confirm that you have read, understood, and agree to these Terms, as well as our{" "}
                  <Link href="/privacy" className="text-accent hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </Prose>
              </Section>

              <Section id="eligibility" title="2. Eligibility">
                <Prose>
                  You must be at least 18 years old to use TattooMaps. By using the Platform you represent that you are 18 or older and that you have the legal capacity to enter into a binding contract in your jurisdiction. If you are using TattooMaps on behalf of a business, you represent that you have authority to bind that business to these Terms.
                </Prose>
              </Section>

              <Section id="accounts" title="3. Accounts">
                <Prose>
                  You are responsible for maintaining the security of your account credentials. Do not share your password. You agree to notify us immediately of any unauthorised access to your account. TattooMaps is not liable for any loss resulting from unauthorised use of your account. We reserve the right to suspend or terminate accounts that we reasonably believe have been compromised or are being used in violation of these Terms.
                </Prose>
              </Section>

              <Section id="platform-use" title="4. Use of the Platform">
                <SubHeading>Permitted use</SubHeading>
                <Prose>
                  You may use the Platform for lawful purposes relating to discovering tattoo artists and studios, booking appointments, and generating tattoo design inspiration.
                </Prose>
                <SubHeading>Prohibited conduct</SubHeading>
                <Prose>You must not:</Prose>
                <List
                  items={[
                    "Use the Platform for any unlawful purpose or in violation of any applicable law",
                    "Post false, misleading, or fraudulent content",
                    "Impersonate any person or entity",
                    "Scrape, crawl, or systematically extract data from the Platform without prior written permission",
                    "Attempt to gain unauthorised access to any part of the Platform or its related systems",
                    "Use automated bots or scripts to create accounts or submit forms",
                    "Harass, abuse, or threaten other users",
                    "Upload or transmit viruses or other malicious code",
                    "Circumvent any security or access controls",
                  ]}
                />
              </Section>

              <Section id="artist-terms" title="5. Artist & Studio Terms">
                <Prose>
                  Tattoo artists and studios (&quot;Artists&quot;) may create listings on TattooMaps subject to these additional terms:
                </Prose>
                <List
                  items={[
                    "All information in your listing must be accurate and kept up to date",
                    "Portfolio images must be your own original work",
                    "You are solely responsible for delivering the services you advertise",
                    "You agree to maintain appropriate professional licences and comply with local health and safety regulations",
                    "TattooMaps is a discovery and booking platform — it is not a party to any service agreement between you and your clients",
                    "We reserve the right to remove listings that violate our community standards",
                  ]}
                />
              </Section>

              <Section id="bookings" title="6. Bookings & Payments">
                <Prose>
                  TattooMaps facilitates bookings between clients and artists. Deposits and payment policies are set by individual artists and are displayed on their profiles. TattooMaps is not responsible for disputes between clients and artists regarding services, refunds, or deposits. If a dispute arises, we encourage both parties to resolve it directly. We may offer mediation assistance at our discretion.
                </Prose>
                <Prose>
                  Platform service fees (if applicable) are non-refundable once a booking is confirmed, except where required by law.
                </Prose>
              </Section>

              <Section id="ai-generator" title="7. AI Tattoo Generator">
                <Prose>
                  The AI Tattoo Generator produces design concepts for inspiration purposes only. Outputs do not constitute professional tattoo designs and may require modification by a licensed tattoo artist before application. You own the rights to outputs you generate, subject to the following:
                </Prose>
                <List
                  items={[
                    "You may not use AI-generated outputs to infringe third-party intellectual property rights",
                    "You may not represent AI-generated outputs as hand-drawn by a human artist",
                    "TattooMaps grants no warranty that outputs are original or free from third-party claims",
                    "Free credits are non-transferable and expire according to the terms stated at the time of issuance",
                  ]}
                />
              </Section>

              <Section id="content" title="8. User Content">
                <Prose>
                  By submitting content to TattooMaps (including portfolio photos, reviews, and profile information) you grant TattooMaps a worldwide, non-exclusive, royalty-free licence to display, reproduce, and distribute that content solely in connection with operating and promoting the Platform. You retain ownership of your content and may delete it at any time by removing it from your account.
                </Prose>
                <Prose>
                  You represent that you own or have the rights to all content you submit, and that it does not infringe any third-party rights.
                </Prose>
              </Section>

              <Section id="intellectual-property" title="9. Intellectual Property">
                <Prose>
                  The TattooMaps name, logo, design, and all platform software are the property of TattooMaps, Inc. and are protected by applicable intellectual property laws. You may not reproduce, modify, distribute, or create derivative works of any TattooMaps property without our express written consent. Nothing in these Terms transfers any TattooMaps intellectual property rights to you.
                </Prose>
              </Section>

              <Section id="disclaimers" title="10. Disclaimers">
                <Prose>
                  THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING FITNESS FOR A PARTICULAR PURPOSE OR NON-INFRINGEMENT. TATTOOMAPS DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES. WE DO NOT ENDORSE ANY ARTIST OR STUDIO LISTED ON THE PLATFORM AND MAKE NO REPRESENTATIONS REGARDING THE QUALITY OF THEIR SERVICES.
                </Prose>
              </Section>

              <Section id="limitation" title="11. Limitation of Liability">
                <Prose>
                  TO THE FULLEST EXTENT PERMITTED BY LAW, TATTOOMAPS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM OR SERVICES BOOKED THROUGH IT. OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO TATTOOMAPS IN THE 12 MONTHS PRECEDING THE CLAIM OR (B) USD $100. SOME JURISDICTIONS DO NOT ALLOW THESE LIMITATIONS, SO THEY MAY NOT APPLY TO YOU.
                </Prose>
              </Section>

              <Section id="termination" title="12. Termination">
                <Prose>
                  You may close your account at any time from your account settings or by contacting support. We may suspend or terminate your access at any time if we determine you have violated these Terms, with or without notice. Upon termination, your right to use the Platform ceases immediately. Sections that by their nature should survive termination (including intellectual property, disclaimers, and limitation of liability) will survive.
                </Prose>
              </Section>

              <Section id="governing-law" title="13. Governing Law">
                <Prose>
                  These Terms are governed by the laws of the State of New York, USA, without regard to conflict-of-law principles. Any dispute arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the state and federal courts located in New York County, New York. If you are a consumer in a jurisdiction where mandatory consumer protection laws apply, those laws may override this clause.
                </Prose>
              </Section>

              <Section id="contact" title="14. Contact">
                <Prose>
                  Questions about these Terms? Reach us at:
                </Prose>
                <div className="flex items-center gap-3 mt-4 p-4 bg-muted/40 rounded-xl border border-border/60">
                  <Mail className="w-5 h-5 text-accent shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Legal Team</p>
                    <a href="mailto:legal@tattoomaps.com" className="text-sm text-accent hover:underline">
                      legal@tattoomaps.com
                    </a>
                  </div>
                </div>
                <Prose>
                  You can also use our{" "}
                  <Link href="/contact" className="text-accent hover:underline">
                    Contact Us
                  </Link>{" "}
                  form and select &quot;General inquiry&quot; as the topic.
                </Prose>
              </Section>
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

// ─── Local layout helpers ──────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-xl font-bold text-foreground border-b border-border pb-3">{title}</h2>
      {children}
    </section>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-foreground mt-4">{children}</h3>
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-sm leading-relaxed">{children}</p>
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-2" />
          {item}
        </li>
      ))}
    </ul>
  )
}
