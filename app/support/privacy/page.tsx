import { Suspense } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, ArrowRight, Mail } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy - TattooMaps",
  description: "Learn how TattooMaps collects, uses, and protects your personal information.",
}

const SECTIONS = [
  { id: "information-we-collect", title: "Information We Collect" },
  { id: "how-we-use", title: "How We Use Your Information" },
  { id: "sharing", title: "Sharing Your Information" },
  { id: "cookies", title: "Cookies & Tracking" },
  { id: "data-retention", title: "Data Retention" },
  { id: "your-rights", title: "Your Rights" },
  { id: "children", title: "Children's Privacy" },
  { id: "security", title: "Data Security" },
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
        <section className="py-20 px-4 text-center border-b border-border/50">
          <div className="container mx-auto max-w-2xl">
            <Badge variant="secondary" className="mb-4 gap-2">
              <Shield className="w-3.5 h-3.5" />
              Legal
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-balance">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Last updated: <span className="text-foreground font-medium">June 1, 2025</span>
            </p>
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed max-w-xl mx-auto">
              This Privacy Policy explains how TattooMaps (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) collects, uses, discloses, and safeguards your information when you use our platform.
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
              <div className="lg:col-span-3 prose-sm max-w-none space-y-12">
                <div className="p-5 bg-accent/10 border border-accent/20 rounded-xl text-sm leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-accent">Summary: </span>
                  We collect information you provide when creating an account, booking appointments, or using our AI generator. We use it to provide our service, improve the platform, and communicate with you. We do not sell your personal data.
                </div>

                <div id="information-we-collect" className="space-y-4">
                  <h2 className="text-xl font-bold">1. Information We Collect</h2>
                  <h3 className="font-semibold text-base">Information You Provide</h3>
                  <ul className="space-y-2 text-muted-foreground text-sm leading-relaxed list-disc list-inside">
                    <li><span className="font-medium text-foreground">Account registration:</span> name, email address, and password when you create an account.</li>
                    <li><span className="font-medium text-foreground">Profile information:</span> bio, profile photo, location, and social links you add to your profile.</li>
                    <li><span className="font-medium text-foreground">Booking information:</span> appointment details, tattoo descriptions, and communication with artists.</li>
                    <li><span className="font-medium text-foreground">Payment information:</span> billing details processed securely by our payment provider (Stripe). We do not store full card numbers.</li>
                    <li><span className="font-medium text-foreground">Communications:</span> messages you send to artists or our support team.</li>
                    <li><span className="font-medium text-foreground">User-generated content:</span> reviews, ratings, and AI-generated design prompts.</li>
                  </ul>
                  <h3 className="font-semibold text-base mt-6">Information Collected Automatically</h3>
                  <ul className="space-y-2 text-muted-foreground text-sm leading-relaxed list-disc list-inside">
                    <li><span className="font-medium text-foreground">Usage data:</span> pages visited, features used, time spent, and click patterns.</li>
                    <li><span className="font-medium text-foreground">Device information:</span> IP address, browser type, operating system, and device identifiers.</li>
                    <li><span className="font-medium text-foreground">Location data:</span> approximate location inferred from IP, or precise location if you grant permission for the map feature.</li>
                    <li><span className="font-medium text-foreground">Cookies and tracking technologies:</span> as described in the Cookies section below.</li>
                  </ul>
                </div>

                <div id="how-we-use" className="space-y-4">
                  <h2 className="text-xl font-bold">2. How We Use Your Information</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">We use the information we collect to:</p>
                  <ul className="space-y-2 text-muted-foreground text-sm leading-relaxed list-disc list-inside">
                    <li>Create and manage your account and provide our core services.</li>
                    <li>Process bookings and payments between users and artists.</li>
                    <li>Personalize your experience, including location-based artist recommendations.</li>
                    <li>Improve and develop new features through anonymized usage analytics.</li>
                    <li>Communicate with you about your bookings, account, and platform updates.</li>
                    <li>Send marketing emails if you have opted in (you can unsubscribe at any time).</li>
                    <li>Detect and prevent fraud, abuse, and violations of our Terms of Service.</li>
                    <li>Comply with applicable legal obligations.</li>
                  </ul>
                </div>

                <div id="sharing" className="space-y-4">
                  <h2 className="text-xl font-bold">3. Sharing Your Information</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">We do not sell your personal data. We may share information in the following circumstances:</p>
                  <ul className="space-y-2 text-muted-foreground text-sm leading-relaxed list-disc list-inside">
                    <li><span className="font-medium text-foreground">With artists:</span> when you submit a booking request, the artist receives your name, message, and desired appointment details.</li>
                    <li><span className="font-medium text-foreground">With service providers:</span> trusted third parties such as Stripe (payments), Supabase (database), and Vercel (hosting) who process data on our behalf under strict data processing agreements.</li>
                    <li><span className="font-medium text-foreground">For legal compliance:</span> we may disclose information when required by law, subpoena, or to protect our rights and the safety of our users.</li>
                    <li><span className="font-medium text-foreground">Business transfers:</span> in the event of a merger, acquisition, or sale of assets, your information may be transferred to the new entity.</li>
                    <li><span className="font-medium text-foreground">With your consent:</span> for any other purpose with your explicit consent.</li>
                  </ul>
                </div>

                <div id="cookies" className="space-y-4">
                  <h2 className="text-xl font-bold">4. Cookies & Tracking</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">We use cookies and similar tracking technologies to:</p>
                  <ul className="space-y-2 text-muted-foreground text-sm leading-relaxed list-disc list-inside">
                    <li><span className="font-medium text-foreground">Essential cookies:</span> required for the platform to function, including authentication and security tokens.</li>
                    <li><span className="font-medium text-foreground">Analytics cookies:</span> help us understand how visitors use our site (via tools like Vercel Analytics). These are anonymized and do not identify individuals.</li>
                    <li><span className="font-medium text-foreground">Preference cookies:</span> remember your settings such as dark/light mode.</li>
                  </ul>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    You can manage or disable cookies through your browser settings. Disabling essential cookies may prevent parts of the platform from functioning correctly.
                  </p>
                </div>

                <div id="data-retention" className="space-y-4">
                  <h2 className="text-xl font-bold">5. Data Retention</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    We retain your personal data for as long as your account is active or as needed to provide our services. If you delete your account, we will delete or anonymize your personal data within 30 days, except where we are legally required to retain it (for example, payment records for tax and accounting purposes, which are kept for 7 years).
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Anonymized, aggregated data may be retained indefinitely for analytical purposes.
                  </p>
                </div>

                <div id="your-rights" className="space-y-4">
                  <h2 className="text-xl font-bold">6. Your Rights</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">Depending on your jurisdiction, you may have the right to:</p>
                  <ul className="space-y-2 text-muted-foreground text-sm leading-relaxed list-disc list-inside">
                    <li><span className="font-medium text-foreground">Access:</span> request a copy of the personal data we hold about you.</li>
                    <li><span className="font-medium text-foreground">Correction:</span> request that inaccurate or incomplete data be corrected.</li>
                    <li><span className="font-medium text-foreground">Deletion:</span> request that your personal data be deleted (subject to legal retention requirements).</li>
                    <li><span className="font-medium text-foreground">Portability:</span> request your data in a machine-readable format.</li>
                    <li><span className="font-medium text-foreground">Objection:</span> object to certain types of processing, including direct marketing.</li>
                    <li><span className="font-medium text-foreground">Restriction:</span> request that we restrict processing of your data in certain circumstances.</li>
                  </ul>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    To exercise any of these rights, contact us at <span className="text-accent">privacy@tattoomaps.com</span>. We will respond within 30 days.
                  </p>
                </div>

                <div id="children" className="space-y-4">
                  <h2 className="text-xl font-bold">7. Children&apos;s Privacy</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    TattooMaps is not intended for individuals under the age of 18. We do not knowingly collect personal data from anyone under 18. Tattoos are a permanent body modification, and all users must be of legal tattooing age in their jurisdiction. If we learn that we have collected data from a minor, we will delete it promptly.
                  </p>
                </div>

                <div id="security" className="space-y-4">
                  <h2 className="text-xl font-bold">8. Data Security</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    We implement industry-standard security measures to protect your personal data, including:
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm leading-relaxed list-disc list-inside">
                    <li>Encryption of data in transit using TLS/HTTPS.</li>
                    <li>Encryption of sensitive data at rest.</li>
                    <li>Password hashing using bcrypt with salt rounds.</li>
                    <li>Row-level security on our database to ensure users can only access their own data.</li>
                    <li>Regular security audits and penetration testing.</li>
                  </ul>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    While we take every reasonable precaution, no system is completely secure. Please use a strong, unique password and enable two-factor authentication when available.
                  </p>
                </div>

                <div id="changes" className="space-y-4">
                  <h2 className="text-xl font-bold">9. Changes to This Policy</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. When we make material changes, we will notify you by email and update the &quot;Last updated&quot; date at the top of this page. Your continued use of TattooMaps after the effective date constitutes acceptance of the revised policy.
                  </p>
                </div>

                <div id="contact" className="space-y-4">
                  <h2 className="text-xl font-bold">10. Contact Us</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    If you have questions about this Privacy Policy or our data practices, please contact our Privacy Team:
                  </p>
                  <div className="p-5 bg-card border border-border/60 rounded-xl space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-accent" />
                      <span className="text-muted-foreground">Email: <span className="text-accent">privacy@tattoomaps.com</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-accent" />
                      <span className="text-muted-foreground">Data Protection Officer: Available upon request</span>
                    </div>
                  </div>
                  <Button asChild className="mt-4">
                    <Link href="/support/contact">
                      Contact Support
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
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
