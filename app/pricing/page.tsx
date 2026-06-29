import type { Metadata } from "next"
import { PricingClient } from "@/components/pricing/pricing-client"

export const metadata: Metadata = {
  title: "Tattoo Pricing Guide & Cost Calculator | TattooMaps",
  description: "Understand tattoo costs with our interactive price calculator. Learn what affects pricing — style, size, artist experience, and location — and get accurate estimates.",
  alternates: { canonical: "/pricing" },
}

export default function PricingGuidePage() {
  return <PricingClient />
}
