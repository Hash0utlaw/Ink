"use client"

import { useState } from "react"
import { Suspense } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  MessageCircle,
  Mail,
  Clock,
  HelpCircle,
  Shield,
  User,
  CheckCircle,
  MapPin,
  Instagram,
  Twitter,
} from "lucide-react"

const CONTACT_REASONS = [
  "General inquiry",
  "Booking issue",
  "Account or login problem",
  "Report a listing",
  "Artist / studio onboarding",
  "Billing or payment question",
  "AI Generator feedback",
  "Press or partnership",
  "Other",
]

const CONTACT_CHANNELS = [
  {
    icon: Mail,
    title: "Email Support",
    description: "Send us a message and we will respond within 24 hours on business days.",
    detail: "support@tattoomaps.com",
    href: "mailto:support@tattoomaps.com",
  },
  {
    icon: MessageCircle,
    title: "Live Chat",
    description: "Chat with a support agent during business hours for immediate help.",
    detail: "Mon – Fri, 9am – 6pm EST",
    href: "#",
  },
  {
    icon: HelpCircle,
    title: "Help Center",
    description: "Browse articles, FAQs, and guides to solve common issues yourself.",
    detail: "Available 24/7",
    href: "/help",
  },
]

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    reason: "",
    message: "",
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.reason || !formData.message) return
    setLoading(true)
    // Simulate submission delay
    await new Promise((res) => setTimeout(res, 1000))
    setLoading(false)
    setSubmitted(true)
  }

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
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              Contact Us
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground">
              We&apos;re here to help
            </h1>
            <p className="text-lg text-muted-foreground">
              Reach out through any of the channels below or fill in the form and we&apos;ll get back to you promptly.
            </p>
          </div>
        </section>

        {/* Contact channels */}
        <section className="py-12 px-4 border-b border-border">
          <div className="container mx-auto max-w-5xl">
            <div className="grid sm:grid-cols-3 gap-4">
              {CONTACT_CHANNELS.map((ch) => {
                const Icon = ch.icon
                return (
                  <Link key={ch.title} href={ch.href} className="group block">
                    <Card className="h-full hover:border-accent/40 transition-all duration-200">
                      <CardContent className="p-6 flex flex-col gap-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                          <Icon className="w-5 h-5 text-accent" />
                        </div>
                        <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                          {ch.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed flex-1">{ch.description}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {ch.detail}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* Form + Sidebar */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="grid lg:grid-cols-3 gap-10">
              {/* Form */}
              <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold mb-6">Send us a message</h2>

                {submitted ? (
                  <div className="flex flex-col items-center text-center py-16 px-6 border border-border rounded-2xl bg-card">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Message received!</h3>
                    <p className="text-muted-foreground max-w-sm">
                      Thanks for reaching out, {formData.name}. We&apos;ll reply to{" "}
                      <span className="text-foreground font-medium">{formData.email}</span> within 24 hours on
                      business days.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false)
                        setFormData({ name: "", email: "", reason: "", message: "" })
                      }}
                      className="mt-6 text-sm text-accent hover:underline"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          placeholder="Jane Smith"
                          value={formData.name}
                          onChange={(e) => handleChange("name", e.target.value)}
                          required
                          className="bg-card border-border focus:border-accent/60"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="jane@example.com"
                          value={formData.email}
                          onChange={(e) => handleChange("email", e.target.value)}
                          required
                          className="bg-card border-border focus:border-accent/60"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reason">What can we help with?</Label>
                      <Select value={formData.reason} onValueChange={(v) => handleChange("reason", v)}>
                        <SelectTrigger id="reason" className="bg-card border-border">
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTACT_REASONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Describe your issue or question in as much detail as possible..."
                        rows={6}
                        value={formData.message}
                        onChange={(e) => handleChange("message", e.target.value)}
                        required
                        className="bg-card border-border focus:border-accent/60 resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || !formData.name || !formData.email || !formData.reason || !formData.message}
                      className="w-full sm:w-auto px-8 h-11"
                    >
                      {loading ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                )}
              </div>

              {/* Sidebar info */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                    Response Times
                  </h3>
                  <div className="space-y-3">
                    {[
                      { type: "General inquiries", time: "Within 24 hours" },
                      { type: "Billing issues", time: "Within 12 hours" },
                      { type: "Safety reports", time: "Within 4 hours" },
                      { type: "Live chat", time: "Immediate (business hours)" },
                    ].map((item) => (
                      <div key={item.type} className="flex justify-between items-center text-sm py-2 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground">{item.type}</span>
                        <span className="text-foreground font-medium text-right max-w-[120px]">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                    Office Hours
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4 text-accent shrink-0" />
                      Mon – Fri: 9am – 6pm EST
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4 text-accent shrink-0" />
                      Sat – Sun: Closed
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                    Connect with Us
                  </h3>
                  <div className="flex gap-3">
                    <a
                      href="#"
                      aria-label="TattooMaps on Instagram"
                      className="w-9 h-9 bg-muted hover:bg-accent/10 border border-border hover:border-accent/40 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Instagram className="w-4 h-4 text-muted-foreground hover:text-accent" />
                    </a>
                    <a
                      href="#"
                      aria-label="TattooMaps on Twitter"
                      className="w-9 h-9 bg-muted hover:bg-accent/10 border border-border hover:border-accent/40 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Twitter className="w-4 h-4 text-muted-foreground hover:text-accent" />
                    </a>
                    <a
                      href="mailto:support@tattoomaps.com"
                      aria-label="Email TattooMaps"
                      className="w-9 h-9 bg-muted hover:bg-accent/10 border border-border hover:border-accent/40 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Mail className="w-4 h-4 text-muted-foreground hover:text-accent" />
                    </a>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-xl border border-border/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium">Privacy Notice</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Information you share here is used solely to respond to your inquiry. See our{" "}
                    <Link href="/privacy" className="text-accent hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </p>
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
