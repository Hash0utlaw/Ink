"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, ArrowLeft, Wand2 } from "lucide-react"

const STYLES = [
  { label: "Traditional", emoji: "⚓" },
  { label: "Neo-Traditional", emoji: "🌹" },
  { label: "Japanese", emoji: "🐉" },
  { label: "Blackwork", emoji: "◼" },
  { label: "Fine Line", emoji: "✒️" },
  { label: "Realism", emoji: "🖼" },
  { label: "Watercolor", emoji: "🎨" },
  { label: "Geometric", emoji: "◆" },
  { label: "New School", emoji: "🎭" },
  { label: "Illustrative", emoji: "✏️" },
  { label: "Tribal", emoji: "🌀" },
  { label: "Minimalist", emoji: "—" },
]

const SIZES = [
  { label: "Tiny", sub: "coin-sized or smaller", icon: "◦" },
  { label: "Small", sub: "palm-sized", icon: "○" },
  { label: "Medium", sub: "forearm / calf", icon: "◉" },
  { label: "Large", sub: "half sleeve / back piece", icon: "●" },
]

const BUDGETS = [
  { label: "$", sub: "Under $200", value: "low" },
  { label: "$$", sub: "$200–$500", value: "medium" },
  { label: "$$$", sub: "$500–$1,000", value: "high" },
  { label: "$$$$", sub: "$1,000+", value: "luxury" },
]

const STEPS = ["Style", "Size", "Budget", "Location"]

export default function FindArtistPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [style, setStyle] = useState("")
  const [size, setSize] = useState("")
  const [budget, setBudget] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [locating, setLocating] = useState(false)

  function goNext() {
    if (step < 3) setStep((s) => s + 1)
    else findArtists()
  }

  function canAdvance() {
    if (step === 0) return !!style
    if (step === 1) return !!size
    if (step === 2) return !!budget
    return true
  }

  function findArtists() {
    const params = new URLSearchParams()
    if (style) params.set("style", style)
    if (size) params.set("size", size)
    if (budget) params.set("budget", budget)
    if (city) params.set("city", city)
    if (state) params.set("state", state)
    router.push(`/find-artist/results?${params}`)
  }

  function useMyLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          )
          const data = await res.json()
          const addr = data.address ?? {}
          setCity(addr.city ?? addr.town ?? addr.village ?? "")
          setState(addr.state_code ?? addr["ISO3166-2-lvl4"]?.split("-")[1] ?? "")
        } catch {
          // silent
        } finally {
          setLocating(false)
        }
      },
      () => setLocating(false)
    )
  }

  const progress = ((step + 1) / 4) * 100

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-sm text-[#7C3AED] mb-4">
              <Wand2 className="w-4 h-4" />
              Artist Finder
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold">Find your perfect artist</h1>
            <p className="text-muted-foreground mt-2">Answer 4 quick questions — we'll match you with artists near you.</p>
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {STEPS.map((s, i) => (
                <span key={s} className={`text-xs font-medium ${i === step ? "text-[#7C3AED]" : i < step ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                  {s}
                </span>
              ))}
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-[#7C3AED] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Step 0 — Style */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">What style speaks to you?</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {STYLES.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setStyle(s.label)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 text-sm font-medium transition-all ${
                      style === s.label
                        ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED] shadow-sm shadow-[#7C3AED]/20"
                        : "border-border bg-card text-muted-foreground hover:border-[#7C3AED]/40 hover:bg-muted/40"
                    }`}
                  >
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="text-xs leading-tight text-center">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — Size */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">How big are you thinking?</h2>
              <div className="grid grid-cols-2 gap-3">
                {SIZES.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setSize(s.label)}
                    className={`flex items-center gap-3 rounded-xl border p-5 text-left transition-all ${
                      size === s.label
                        ? "border-[#7C3AED] bg-[#7C3AED]/10 shadow-sm shadow-[#7C3AED]/20"
                        : "border-border bg-card hover:border-[#7C3AED]/40 hover:bg-muted/40"
                    }`}
                  >
                    <span className={`text-3xl font-black w-8 text-center ${size === s.label ? "text-[#7C3AED]" : "text-muted-foreground"}`}>{s.icon}</span>
                    <div>
                      <p className="font-bold text-sm">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Budget */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">What's your budget?</h2>
              <div className="grid grid-cols-2 gap-3">
                {BUDGETS.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setBudget(b.value)}
                    className={`flex flex-col items-center rounded-xl border p-6 transition-all ${
                      budget === b.value
                        ? "border-[#7C3AED] bg-[#7C3AED]/10 shadow-sm shadow-[#7C3AED]/20"
                        : "border-border bg-card hover:border-[#7C3AED]/40 hover:bg-muted/40"
                    }`}
                  >
                    <span className={`text-3xl font-black ${budget === b.value ? "text-[#7C3AED]" : "text-muted-foreground"}`}>{b.label}</span>
                    <span className="text-xs text-muted-foreground mt-1">{b.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Location */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">Where are you located?</h2>
              <p className="text-sm text-muted-foreground text-center">We'll show you artists nearby. Skip to see all matches.</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">City</label>
                    <Input
                      placeholder="e.g. Austin"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">State</label>
                    <Input
                      placeholder="e.g. TX"
                      maxLength={2}
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={useMyLocation}
                  disabled={locating}
                >
                  <MapPin className="w-4 h-4" />
                  {locating ? "Detecting location…" : "Use my location"}
                </Button>
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <Button variant="outline" className="flex-none" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <Button
              className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] h-12 text-base"
              disabled={!canAdvance()}
              onClick={goNext}
            >
              {step < 3 ? "Next →" : "Find my artists"}
            </Button>
          </div>

          {step === 3 && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              <button type="button" onClick={findArtists} className="hover:underline">
                Skip location — show all matches
              </button>
            </p>
          )}

          <p className="text-center text-xs text-muted-foreground mt-6">
            Already know who you want?{" "}
            <Link href="/artists" className="text-[#7C3AED] hover:underline">Browse all artists</Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
