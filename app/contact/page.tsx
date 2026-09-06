import type { Metadata } from "next"
import { ContactClient } from "@/components/contact/contact-client"

export const metadata: Metadata = {
  title: "Contact TattooMaps | Support & Inquiries",
  description: "Get in touch with the TattooMaps team. Reach out for booking help, account questions, artist onboarding, press inquiries, or any other questions.",
  alternates: { canonical: "/contact" },
}

export default function ContactPage() {
  return <ContactClient />
}
