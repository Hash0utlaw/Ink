import { MapPin } from "@/components/brand/map-pin"

const STEPS = [
  {
    title: "Search by place and style",
    text: "Tell us where you are and what you want. We show every shop and artist nearby.",
  },
  {
    title: "Compare their work",
    text: "Look through styles, portfolios and ratings side by side.",
  },
  {
    title: "Send a request",
    text: "Describe your idea once. The artist replies to you directly.",
  },
]

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="mx-auto w-full max-w-[1344px] px-6">
      <h2 id="how-heading" className="text-[30px] leading-[1.15] text-ink md:text-[34px]">
        How it works
      </h2>
      <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex flex-col items-start gap-3">
            <MapPin number={i + 1} />
            <h3 className="font-heading text-[22px] leading-tight text-ink">{step.title}</h3>
            <p className="max-w-[40ch] text-base leading-[1.55] text-ink-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
