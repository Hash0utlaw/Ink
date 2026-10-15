import type { Metadata } from "next"
import { ContactClient } from "@/components/contact/contact-client"

export const metadata: Metadata = {
  title: "Contact TattooMaps | Support & Inquiries",
  description: "Get in touch with the TattooMaps team. Reach out for booking help, account questions, artist onboarding, press inquiries, or any other questions.",
  alternates: { canonical: "/contact" },
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""

/** ?topic= picks a topic and ?message= starts the message ("Report this photo" links use both). */
export default function ContactPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  return <ContactClient initialTopic={one(searchParams.topic)} initialMessage={one(searchParams.message).slice(0, 2000)} />
}
