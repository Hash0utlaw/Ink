import type { Metadata } from "next"
import { HelpClient } from "@/components/help/help-client"

export const metadata: Metadata = {
  title: "Help Center — FAQs & Support | TattooMaps",
  description: "Find answers to common questions about booking tattoo appointments, artist profiles, payments, the AI generator, and more on TattooMaps.",
  alternates: { canonical: "/help" },
}

export default function HelpCenterPage() {
  return <HelpClient />
}
