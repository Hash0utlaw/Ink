import { Suspense } from "react"
import type { Metadata } from "next"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { HeaderSkeleton } from "@/components/layout/header-skeleton"
import { Badge } from "@/components/ui/badge"
import { FileText } from "lucide-react"

export const metadata: Metadata = {
  title: "Data Sources & Attributions | TattooMaps",
  description: "Open data sources used by TattooMaps and their licenses.",
}

// Foursquare requires the full content of its NOTICE.txt to be preserved.
// Source: https://opensource.foursquare.com/places-notice-txt/
const FOURSQUARE_NOTICE = [
  "© 2026 Foursquare Labs, Inc. All rights reserved.",
  "The Foursquare OS Places dataset (the “Data”) is licensed under the Apache License, Version 2.0 (the “License”). You may not use, modify, or distribute the Data except in compliance with the License.",
  "As set forth more fully in the License, if you use, modify, or distribute the Data, you must:",
  "– provide recipients with a copy of the License.",
  "– if applicable, include prominent notices to the extent you’ve changed the Data.",
  "– preserve attribution to Foursquare, including preserving the full content of this NOTICE.txt file.",
  "To ensure appropriate attribution to Foursquare, we recommend the following:",
  "– if using/distributing the Data in flat file form as-is or after making changes/modifications: include this NOTICE.txt file, which may be modified to include an additional notice of your changes/modifications, if any.",
  "– if using/distributing the Data in API form as-is or after making changes/modifications: include a copy of the content from this NOTICE.txt file prominently in your developer documentation for such API, which may be modified to include an additional notice of your changes/modifications, if any.",
  "You may obtain a copy of the License at: http://www.apache.org/licenses/LICENSE-2.0. Unless required by applicable law or agreed to in writing, the Data distributed under the License is distributed on an “AS IS” BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.",
  "See the License for the specific language governing permissions and limitations under the License.",
  "We also encourage you to join our Placemaker community where you can contribute and provide suggestions to improve the accuracy of the Data for future releases for yourself and others.",
]

export default function AttributionsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <main className="flex-1">
        <section className="py-16 px-4 bg-secondary border-b border-border">
          <div className="container mx-auto max-w-4xl">
            <Badge variant="secondary" className="mb-4">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Legal
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-foreground">Data Sources</h1>
            <p className="text-muted-foreground">Open data used to build the TattooMaps shop directory.</p>
          </div>
        </section>

        <div className="container mx-auto max-w-4xl px-4 py-12">
          <article className="space-y-10 text-foreground">
            <Section id="overture" title="Overture Maps Foundation">
              <Prose>
                Some shop listings and details come from the{" "}
                <ExternalLink href="https://overturemaps.org/">Overture Maps Foundation</ExternalLink> places dataset,
                used under{" "}
                <ExternalLink href="https://docs.overturemaps.org/attribution/">
                  Overture&apos;s attribution and licensing terms
                </ExternalLink>{" "}
                (<ExternalLink href="https://cdla.dev/permissive-2-0/">CDLA Permissive 2.0</ExternalLink>). © Overture
                Maps Foundation.
              </Prose>
            </Section>

            <Section id="foursquare" title="Foursquare">
              <Prose>
                The Overture places data includes data from{" "}
                <ExternalLink href="https://foursquare.com/">Foursquare</ExternalLink>. Copyright 2024 Foursquare Labs,
                Inc. All rights reserved. Available under{" "}
                <ExternalLink href="https://www.apache.org/licenses/LICENSE-2.0">Apache 2.0</ExternalLink>. The full{" "}
                <ExternalLink href="https://opensource.foursquare.com/places-notice-txt/">NOTICE.txt</ExternalLink> is
                reproduced below.
              </Prose>
              <div className="p-5 bg-muted/40 rounded-xl border border-border/60 space-y-3">
                {FOURSQUARE_NOTICE.map((line) => (
                  <Prose key={line}>{line}</Prose>
                ))}
              </div>
            </Section>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-xl font-bold text-foreground border-b border-border pb-3">{title}</h2>
      {children}
    </section>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-sm leading-relaxed">{children}</p>
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-text hover:underline">
      {children}
    </a>
  )
}
