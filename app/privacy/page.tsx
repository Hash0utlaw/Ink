import { Suspense } from "react"
import Link from "next/link"
import type { Metadata } from "next"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Badge } from "@/components/ui/badge"
import { Shield, Mail, ChevronRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Privacy Policy | TattooMaps",
  description: "Learn how TattooMaps collects, uses, and protects your personal information.",
}

const SECTIONS = [
  { id: "information-we-collect", title: "Information We Collect" },
  { id: "how-we-use", title: "How We Use Your Information" },
  { id: "sharing", title: "Sharing Your Information" },
  { id: "cookies", title: "Cookies & Tracking" },
  { id: "data-retention", title: "Data Retention" },
  { id: "your-rights", title: "Your Rights" },
  { id: "security", title: "Security" },
  { id: "childrens-privacy", title: "Children's Privacy" },
  { id: "changes", title: "Changes to This Policy" },
  { id: "contact", title: "Contact Us" },
]

export default function PrivacyPolicyPage() {
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
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              Legal
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-foreground">Privacy Policy</h1>
            <p className="text-muted-foreground">
              Last updated: <span className="text-foreground font-medium">June 1, 2025</span>
            </p>
          </div>
        </section>

        <div className="container mx-auto max-w-6xl px-4 py-12">
          <div className="grid lg:grid-cols-4 gap-10">
            {/* Sticky table of contents */}
            <aside className="hidden lg:block">
              <nav className="sticky top-24 space-y-1" aria-label="Privacy policy sections">
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
            <article className="lg:col-span-3 prose-style space-y-10 text-foreground">
              <div className="p-5 bg-muted/40 rounded-xl border border-border/60 text-sm text-muted-foreground leading-relaxed">
                TattooMaps (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, and your choices regarding that data. By using TattooMaps, you agree to the practices described here.
              </div>

              <Section id="information-we-collect" title="1. Information We Collect">
                <SubHeading>Information you provide</SubHeading>
                <Prose>
                  When you create an account, book an appointment, or contact us, we collect: your name and email address; username and password (stored in hashed form); profile information you add (bio, location, portfolio photos for artists); payment information processed securely via our payment processor — we never store full card numbers; messages you send through the platform.
                </Prose>
                <SubHeading>Information collected automatically</SubHeading>
                <Prose>
                  When you use TattooMaps we automatically collect: device and browser type; IP address and approximate location derived from it; pages visited and features used; search queries and map interactions; crash reports and performance data.
                </Prose>
                <SubHeading>Information from third parties</SubHeading>
                <Prose>
                  If you connect a social account (e.g. Instagram) to your profile, we receive the information you authorised that service to share, such as your username and public profile.
                </Prose>
              </Section>

              <Section id="how-we-use" title="2. How We Use Your Information">
                <Prose>We use the information we collect to:</Prose>
                <List
                  items={[
                    "Create and manage your account",
                    "Connect clients with tattoo artists and studios",
                    "Process bookings and payments",
                    "Power the AI Tattoo Generator",
                    "Send transactional emails (booking confirmations, receipts)",
                    "Send optional marketing emails if you have opted in",
                    "Improve and personalise the platform",
                    "Detect and prevent fraud or abuse",
                    "Comply with legal obligations",
                  ]}
                />
                <Prose>
                  We do not sell your personal data to third parties for their own marketing purposes.
                </Prose>
              </Section>

              <Section id="sharing" title="3. Sharing Your Information">
                <Prose>We share your information only in the following circumstances:</Prose>
                <List
                  items={[
                    "With artists or studios you book through the platform, solely to facilitate your appointment",
                    "With payment processors (e.g. Stripe) to complete transactions",
                    "With cloud infrastructure providers who host our services under strict data processing agreements",
                    "With analytics providers (aggregated and anonymised where possible)",
                    "If required by law, court order, or government authority",
                    "In connection with a merger or acquisition, with notice provided to users",
                  ]}
                />
                <Prose>
                  Artist profiles are public by default. Information you include in a public profile (name, location, portfolio) is visible to all visitors.
                </Prose>
              </Section>

              <Section id="cookies" title="4. Cookies & Tracking">
                <Prose>
                  We use cookies and similar technologies to keep you logged in, remember your preferences, and understand how the platform is used. Types of cookies we use:
                </Prose>
                <List
                  items={[
                    "Essential cookies — required for the site to function (cannot be disabled)",
                    "Preference cookies — remember your settings (e.g. dark mode)",
                    "Analytics cookies — anonymous usage data to improve the service",
                    "Marketing cookies — only placed if you opt in",
                  ]}
                />
                <Prose>
                  You can control non-essential cookies via your browser settings or our cookie preferences panel. Note that disabling some cookies may affect functionality.
                </Prose>
              </Section>

              <Section id="data-retention" title="5. Data Retention">
                <Prose>
                  We retain your personal data for as long as your account is active or as needed to provide services. If you delete your account, we remove your personal data within 30 days, except where we are required to retain it for legal, tax, or fraud-prevention purposes. Anonymised usage data may be retained indefinitely.
                </Prose>
              </Section>

              <Section id="your-rights" title="6. Your Rights">
                <Prose>
                  Depending on your jurisdiction (including GDPR in the EU/UK and CCPA in California), you may have the right to:
                </Prose>
                <List
                  items={[
                    "Access the personal data we hold about you",
                    "Correct inaccurate data",
                    "Request deletion of your data",
                    "Object to or restrict certain processing",
                    "Data portability — receive your data in a machine-readable format",
                    "Withdraw consent at any time (where processing is based on consent)",
                    "Opt out of sale of personal information (we do not sell data, but you may still submit this request)",
                  ]}
                />
                <Prose>
                  To exercise any of these rights, email us at{" "}
                  <a href="mailto:privacy@tattoomaps.com" className="text-accent hover:underline">
                    privacy@tattoomaps.com
                  </a>
                  . We will respond within 30 days.
                </Prose>
              </Section>

              <Section id="security" title="7. Security">
                <Prose>
                  We use industry-standard safeguards including TLS encryption in transit, encrypted storage of sensitive fields, access controls, and regular security reviews. No method of transmission over the internet is 100% secure. If you believe your account has been compromised, contact us immediately.
                </Prose>
              </Section>

              <Section id="childrens-privacy" title="8. Children's Privacy">
                <Prose>
                  TattooMaps is not directed to children under 18. We do not knowingly collect personal information from anyone under 18. If we learn that we have collected such information, we will delete it promptly. If you believe a child has provided us with personal information, please contact us.
                </Prose>
              </Section>

              <Section id="changes" title="9. Changes to This Policy">
                <Prose>
                  We may update this Privacy Policy from time to time. When we make material changes, we will notify you via email or a prominent notice on the platform at least 14 days before the changes take effect. Continued use of TattooMaps after that date constitutes acceptance of the updated policy.
                </Prose>
              </Section>

              <Section id="contact" title="10. Contact Us">
                <Prose>
                  If you have questions about this Privacy Policy or want to exercise your data rights, contact us:
                </Prose>
                <div className="flex items-center gap-3 mt-4 p-4 bg-muted/40 rounded-xl border border-border/60">
                  <Mail className="w-5 h-5 text-accent shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Privacy Team</p>
                    <a href="mailto:privacy@tattoomaps.com" className="text-sm text-accent hover:underline">
                      privacy@tattoomaps.com
                    </a>
                  </div>
                </div>
                <Prose>
                  You can also use our{" "}
                  <Link href="/contact" className="text-accent hover:underline">
                    Contact Us
                  </Link>{" "}
                  form and select &quot;Privacy inquiry&quot; as the topic.
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
