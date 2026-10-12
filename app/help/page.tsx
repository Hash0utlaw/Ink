import type { Metadata } from "next"
import { HelpClient } from "@/components/help/help-client"

export const metadata: Metadata = {
  title: "Help Center — FAQs & Support | TattooMaps",
  description: "Find answers to common questions about finding tattoo artists and shops, sending requests, saving favorites, reviews and claiming your page on TattooMaps.",
  alternates: { canonical: "/help" },
}

export default function HelpCenterPage() {
  return <HelpClient />
}
