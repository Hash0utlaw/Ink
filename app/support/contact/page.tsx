"use client"

import { useState } from "react"
import { Suspense } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Footer } from "@/components/layout/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Mail,
  MessageCircle,
  Clock,
  MapPin,
  CheckCircle,
  ArrowRight,
  HelpCircle,
  AlertCircle,
  CreditCard,
  Users,
} from "lucide-react"

const CONTACT_OPTIONS = [
  {
    icon: HelpCircle,
    title: "General Help",
    description: "Questions about using TattooMaps",
    href: "/support/help-center",
    cta: "Browse FAQ",
  },
  {
    icon: CreditCard,
    title: "Billing Issue",
    description: "Payment, refund, or deposit questions",
    href: null,
    cta: "Use form below",
  },
  {
    icon: AlertCircle,
    title: "Report a Problem",
    description: "Report an artist, review, or content",
    href: null,
    cta: "Use form below",
  },
  {
    icon: Users,
    title: "Artist Support",
    description: "Help with your artist dashboard",
    href: null,
    cta: "Use form below",
  },
]

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    message: "",
  })

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Simulate submission delay
    await new Promise((r) => setTimeout(r, 1200))
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
        <section className="py-20 px-4 text-center border-b border-border/50">
          <div className="container mx-auto max-w-2xl">
            <Badge variant="secondary" className="mb-4 gap-2">
              <Mail className="w-3.5 h-3.5" />
              Contact Us
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-balance">
              Get in touch
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Have a question, issue, or feedback? We would love to hear from you. Fill out the form and our team will get back to you shortly.
            </p>
          </div>
        </section>

        {/* Quick options */}
        <section className="py-12 px-4 bg-muted/20 border-b border-border/50">
          <div className="container mx-auto max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CONTACT_OPTIONS.map((opt) => {
                const Icon = opt.icon
                return (
                  <Card key={opt.title} className="bg-card border-border/60">
                    <CardContent className="p-5">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                        <Icon className="w-4 h-4 text-accent" />
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{opt.title}</h3>
                      <p className="text-muted-foreground text-xs mb-3 leading-relaxed">{opt.description}</p>
                      {opt.href ? (
                        <Link
                          href={opt.href}
                          className="text-accent text-xs font-medium inline-flex items-center gap-1 hover:underline"
                        >
                          {opt.cta}
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-xs">{opt.cta}</span>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Form + Info */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="grid lg:grid-cols-3 gap-12">
              {/* Contact Info */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold mb-4">Contact Information</h2>
                  <div className="space-y-5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-muted-foreground text-sm">support@tattoomaps.com</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Response Time</p>
                        <p className="text-muted-foreground text-sm">Within 24 hours on business days</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <MessageCircle className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Live Support Hours</p>
                        <p className="text-muted-foreground text-sm">Mon – Fri, 9am – 6pm EST</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Based in</p>
                        <p className="text-muted-foreground text-sm">New York, NY — Serving globally</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-accent/10 border border-accent/20 rounded-xl">
                  <h3 className="font-semibold text-sm mb-2 text-accent">Before you reach out</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed mb-3">
                    Many common questions are answered in our Help Center. Check there first for a faster resolution.
                  </p>
                  <Link
                    href="/support/help-center"
                    className="text-accent text-xs font-medium inline-flex items-center gap-1 hover:underline"
                  >
                    Visit Help Center
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Form */}
              <div className="lg:col-span-2">
                {submitted ? (
                  <div className="flex flex-col items-center justify-center text-center py-16 px-8 border border-border/60 rounded-2xl bg-card">
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-5">
                      <CheckCircle className="w-8 h-8 text-accent" />
                    </div>
                    <h2 className="text-2xl font-bold mb-3">Message sent</h2>
                    <p className="text-muted-foreground leading-relaxed mb-8 max-w-sm">
                      Thanks for reaching out. We have received your message and will reply to{" "}
                      <span className="text-foreground font-medium">{form.email}</span> within one business day.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="bg-transparent"
                        onClick={() => {
                          setSubmitted(false)
                          setForm({ name: "", email: "", subject: "", category: "", message: "" })
                        }}
                      >
                        Send another message
                      </Button>
                      <Button asChild>
                        <Link href="/">Back to home</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="border border-border/60 rounded-2xl bg-card p-8 space-y-6"
                  >
                    <div>
                      <h2 className="text-xl font-bold mb-1">Send us a message</h2>
                      <p className="text-muted-foreground text-sm">
                        Fill out all fields and we will get back to you as soon as possible.
                      </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full name</Label>
                        <Input
                          id="name"
                          placeholder="Your name"
                          value={form.name}
                          onChange={(e) => handleChange("name", e.target.value)}
                          required
                          className="bg-background border-border/60"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={form.email}
                          onChange={(e) => handleChange("email", e.target.value)}
                          required
                          className="bg-background border-border/60"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={form.category}
                        onValueChange={(v) => handleChange("category", v)}
                        required
                      >
                        <SelectTrigger id="category" className="bg-background border-border/60">
                          <SelectValue placeholder="What is your message about?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Question</SelectItem>
                          <SelectItem value="billing">Billing & Payments</SelectItem>
                          <SelectItem value="booking">Booking Issue</SelectItem>
                          <SelectItem value="artist">Artist Account</SelectItem>
                          <SelectItem value="report">Report a Problem</SelectItem>
                          <SelectItem value="feedback">Product Feedback</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Brief summary of your question"
                        value={form.subject}
                        onChange={(e) => handleChange("subject", e.target.value)}
                        required
                        className="bg-background border-border/60"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Describe your issue or question in as much detail as possible..."
                        value={form.message}
                        onChange={(e) => handleChange("message", e.target.value)}
                        required
                        rows={6}
                        className="bg-background border-border/60 resize-none"
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Sending..." : "Send Message"}
                      {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
