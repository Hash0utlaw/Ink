import type { ReactNode } from "react"
import { STYLES } from "@/lib/styles"
import { Banner } from "./banner"
import { CompassRose } from "./compass-rose"
import { FlashChart } from "./flash-chart"
import { ClusterSeal, MapPin } from "./map-pin"
import { NeatlineFrame } from "./neatline-frame"
import { Plate } from "./plate"
import { StyleBadge } from "./style-badge"
import { StyleSymbol } from "./style-symbol"
import { XMark } from "./x-mark"

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-b border-rule pb-12">
      <div>
        <h2 className="font-heading text-[26px] text-ink">{title}</h2>
        {note && <p className="mt-1 max-w-[70ch] text-[15px] text-ink-muted">{note}</p>}
      </div>
      {children}
    </section>
  )
}

const PLATE_SAMPLES = [
  { name: "Cara Lane", style: "traditional" },
  { name: "Kenji", style: "neo-traditional" },
  { name: "Rosa", style: "realism" },
  { name: "'Dinero' Christian Dasilva", style: "japanese" },
  { name: "Ivy Marsh", style: "illustrative" },
  { name: "Theo", style: null },
]

const PHOTO_SAMPLES = [
  { name: "Portrait sample", src: "/female-tattoo-artist-portrait-1.png" },
  { name: "Portfolio sample", src: "/tattoo-portfolio.jpg" },
  { name: "Botanical sample", src: "/botanical-tattoo.jpg" },
]

/** Living reference for components/brand (rendered at /admin/design). */
export function BrandReference() {
  return (
    <div className="space-y-12">
      <Section title="Style badges" note="All 21 styles. The symbol is the same wherever the style appears.">
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <StyleBadge key={s.slug} slug={s.slug} label={s.label} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-7">
          {STYLES.map((s) => (
            <div key={s.slug} className="flex flex-col items-start gap-1.5">
              <StyleSymbol slug={s.slug} size={32} />
              <code className="text-xs text-ink-muted">{s.slug}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Plates"
        note="4:5 frame. Without a photo: initials in Young Serif and a bottom edge in the main style's color (ink when none)."
      >
        <div className="flex flex-wrap gap-5">
          {PLATE_SAMPLES.map((p) => (
            <div key={p.name} className="space-y-2">
              <Plate name={p.name} alt={p.name} primaryStyle={p.style} size={128} />
              <p className="text-[13px] text-ink-muted">{p.style ?? "no style"}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-5">
          {PHOTO_SAMPLES.map((p) => (
            <Plate key={p.src} src={p.src} name={p.name} alt={p.name} size={128} />
          ))}
        </div>
      </Section>

      <Section title="Pins and seals" note="Pin 34px: default vellum, selected flash red. Cluster seal 46px flash yellow.">
        <div className="flex flex-wrap items-center gap-4">
          <MapPin number={4} />
          <MapPin number={12} />
          <MapPin number={2} selected />
          <ClusterSeal count={38} />
          <ClusterSeal count={210} />
        </div>
      </Section>

      <Section title="Flash chart: hero" note="Home hero, inside the neatline frame.">
        <NeatlineFrame className="h-[460px]">
          <FlashChart variant="hero" />
        </NeatlineFrame>
      </Section>

      <Section title="Flash chart: hero, centered">
        <NeatlineFrame className="h-[460px]">
          <FlashChart variant="hero-centered" />
        </NeatlineFrame>
      </Section>

      <Section title="Flash chart: location" note="Artist and shop pages. The banner takes the place name.">
        <div className="grid gap-6 md:grid-cols-2">
          <NeatlineFrame className="h-[320px]">
            <FlashChart variant="location" placeName="NoDa" />
          </NeatlineFrame>
          <NeatlineFrame className="h-[320px]">
            <FlashChart variant="location" placeName="Plaza Midwood" />
          </NeatlineFrame>
        </div>
      </Section>

      <Section title="Compass, banner, X">
        <div className="flex flex-wrap items-center gap-10">
          <CompassRose size={112} tone="land" />
          <div className="bg-night p-4">
            <CompassRose size={112} tone="sea" />
          </div>
          <Banner text="Charlotte" fontSize={26} />
          <Banner text="NoDa" />
          <XMark size={40} />
        </div>
      </Section>
    </div>
  )
}
