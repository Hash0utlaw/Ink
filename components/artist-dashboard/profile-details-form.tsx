"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { StyleSymbol } from "@/components/brand/style-symbol"
import { STYLES } from "@/lib/styles"
import {
  ACCEPTING_OPTIONS,
  LIMITS,
  acceptingLabel,
  priceLine,
  validateProfileDetails,
  type AcceptingClients,
  type FieldErrors,
  type ProfileDetailsInput,
  type ProfileField,
} from "@/lib/profile-details"
import { cn } from "@/lib/utils"

// Round 12 "Profile details": About you, Your styles, Booking and prices, Where
// people can find you. Saved to /api/artist/profile, which checks everything again.

const SECTION = "flex flex-col gap-[18px] rounded border-1.5 border-ink bg-vellum tex-vellum p-5 sm:p-6"
const INPUT_BOX =
  "flex min-h-12 items-center rounded border-1.5 border-ink bg-white focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
const INPUT_BOX_ERROR = "border-flash-red"
const INPUT = "min-w-0 flex-1 self-stretch bg-transparent px-3 text-[15px] leading-[1.55] text-ink placeholder:text-ink-muted focus:outline-none"
const CHOICE =
  "inline-flex min-h-11 items-center rounded border-1.5 border-ink px-3.5 text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

/** What the dashboard page passes in, already shaped for the form. */
export type ProfileDetailsInitial = ProfileDetailsInput

function SectionHead({ id, title, hint }: { id: string; title: string; hint: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className="font-heading text-[22px] leading-[1.15] text-ink">{title}</h2>
      <p className="text-sm text-ink-muted text-pretty">{hint}</p>
    </div>
  )
}

function Field({
  id,
  label,
  count,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  count?: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        {count && <span className="text-[13px] tabular-nums text-ink-muted">{count}</span>}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] font-semibold leading-[1.45] text-flash-red">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-[13px] leading-[1.45] text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/** A text input in the canvas's white box, with an optional muted prefix ("$", "https://"). */
function BoxInput({
  id,
  value,
  onChange,
  prefix,
  error,
  hint,
  placeholder,
  maxLength,
  inputMode,
  disabled,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  prefix?: string
  error?: string
  hint?: boolean
  placeholder?: string
  maxLength?: number
  inputMode?: "numeric" | "url" | "text"
  disabled?: boolean
}) {
  return (
    <span className={cn(INPUT_BOX, error && INPUT_BOX_ERROR)}>
      {prefix && (
        <span className="shrink-0 pl-3 text-[15px] text-ink-muted" aria-hidden="true">
          {prefix}
        </span>
      )}
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(INPUT, prefix && "pl-1")}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete="off"
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
    </span>
  )
}

const asText = (n: number | null) => (n == null ? "" : String(n))
/** "https://kamil.com/" shown as "kamil.com" after the https:// prefix. */
const bareUrl = (url: string) => url.replace(/^https?:\/\//i, "").replace(/\/$/, "")
/** A form price: "" stays empty; digits become a number; anything else goes to the server as typed, to be refused. */
const priceValue = (s: string): number | string | null => (s.trim() === "" ? null : /^\d+$/.test(s.trim()) ? Number(s.trim()) : s)

export function ProfileDetailsForm({ initial }: { initial: ProfileDetailsInitial }) {
  const router = useRouter()
  const [name, setName] = useState(initial.display_name)
  const [bio, setBio] = useState(initial.bio)
  const [styles, setStyles] = useState<string[]>(initial.styles)
  const [accepting, setAccepting] = useState<AcceptingClients>(initial.accepting_clients)
  const [minimum, setMinimum] = useState(asText(initial.shop_minimum))
  const [rateMin, setRateMin] = useState(asText(initial.hourly_rate_min))
  const [rateMax, setRateMax] = useState(asText(initial.hourly_rate_max))
  const [notes, setNotes] = useState(initial.pricing_notes)
  const [instagram, setInstagram] = useState(initial.instagram_handle)
  const [tiktok, setTiktok] = useState(initial.tiktok_handle)
  const [website, setWebsite] = useState(bareUrl(initial.website))
  const [booking, setBooking] = useState(bareUrl(initial.booking_url))

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  // Any edit clears the saved note.
  const edit =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setSaved(false)
    }

  function toggleStyle(slug: string) {
    setSaved(false)
    setStyles((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : cur.length < LIMITS.styles ? [...cur, slug] : cur))
  }

  const preview = {
    shopMinimum: /^\d+$/.test(minimum.trim()) ? Number(minimum) : null,
    hourlyRateMin: /^\d+$/.test(rateMin.trim()) ? Number(rateMin) : null,
    hourlyRateMax: /^\d+$/.test(rateMax.trim()) ? Number(rateMax) : null,
  }
  const previewPrices = priceLine(preview)

  async function save() {
    const body: Record<ProfileField, unknown> = {
      display_name: name,
      bio,
      styles,
      instagram_handle: instagram,
      tiktok_handle: tiktok,
      website,
      booking_url: booking,
      accepting_clients: accepting,
      shop_minimum: priceValue(minimum),
      hourly_rate_min: priceValue(rateMin),
      hourly_rate_max: priceValue(rateMax),
      pricing_notes: notes,
    }
    setSaved(false)
    setFormError(null)
    // The same checks as the server, so mistakes show before sending.
    const local = validateProfileDetails(body)
    if (local.errors) {
      setErrors(local.errors)
      setFormError("Fix the fields marked in red, then save again.")
      return
    }
    setErrors({})
    setSaving(true)
    try {
      const res = await fetch("/api/artist/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (json.fields) setErrors(json.fields as FieldErrors)
        setFormError(json.fields ? "Fix the fields marked in red, then save again." : (json.error ?? "Couldn't save. Try again."))
        return
      }
      // Show what was stored: handles and links as the server cleaned them.
      const patch = local.patch
      if (typeof patch.instagram_handle === "string" || patch.instagram_handle === null) setInstagram(patch.instagram_handle ?? "")
      if (typeof patch.tiktok_handle === "string" || patch.tiktok_handle === null) setTiktok(patch.tiktok_handle ?? "")
      setWebsite(bareUrl(String(patch.website_url ?? "")))
      setBooking(bareUrl(String(patch.booking_url ?? "")))
      setName(String(patch.display_name ?? name))
      setSaved(true)
      router.refresh()
    } catch {
      setFormError("Couldn't save. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
      className="flex flex-col gap-[22px]"
    >
      <section className={SECTION} aria-labelledby="about-heading">
        <SectionHead id="about-heading" title="About you" hint="This is what people see at the top of your page." />
        <Field
          id="pd-name"
          label="Display name"
          hint="The name clients know you by. Your real name or your artist name."
          error={errors.display_name}
        >
          <BoxInput id="pd-name" value={name} onChange={edit(setName)} maxLength={LIMITS.nameMax} error={errors.display_name} hint disabled={saving} />
        </Field>
        <Field
          id="pd-bio"
          label="Bio"
          count={`${bio.length} of ${LIMITS.bio}`}
          hint="A few sentences about your work and how you like to book."
          error={errors.bio}
        >
          <span className={cn(INPUT_BOX, "items-start", errors.bio && INPUT_BOX_ERROR)}>
            <textarea
              id="pd-bio"
              value={bio}
              onChange={(e) => edit(setBio)(e.target.value)}
              maxLength={LIMITS.bio}
              rows={5}
              disabled={saving}
              className={cn(INPUT, "min-h-[136px] resize-y py-3")}
              aria-invalid={errors.bio ? true : undefined}
              aria-describedby={errors.bio ? "pd-bio-error" : "pd-bio-hint"}
            />
          </span>
        </Field>
      </section>

      <section className={SECTION} aria-labelledby="styles-heading">
        <SectionHead id="styles-heading" title="Your styles" hint="Pick up to 5. They decide which searches you show up in." />
        <div role="group" aria-label="Your styles" className="flex flex-wrap gap-2">
          {STYLES.map(({ slug, label }) => {
            const on = styles.includes(slug)
            const full = !on && styles.length >= LIMITS.styles
            return (
              <button
                key={slug}
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-disabled={full || undefined}
                onClick={() => toggleStyle(slug)}
                disabled={saving}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded border-1.5 border-ink px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  on ? "bg-ink text-vellum" : "bg-vellum tex-vellum text-ink hover:bg-secondary",
                  full && "cursor-not-allowed opacity-50 hover:bg-vellum",
                )}
              >
                {on ? (
                  <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-sm bg-vellum">
                    <StyleSymbol slug={slug} size={12} />
                  </span>
                ) : (
                  <StyleSymbol slug={slug} size={12} />
                )}
                {label}
              </button>
            )
          })}
        </div>
        <p className={cn("text-[13px] tabular-nums", errors.styles ? "font-semibold text-flash-red" : "text-ink-muted")} aria-live="polite">
          {errors.styles ?? `${styles.length} of ${LIMITS.styles} chosen`}
        </p>
      </section>

      <section className={SECTION} aria-labelledby="booking-heading">
        <SectionHead id="booking-heading"             title="Booking and prices"
            hint="Clients see this on your page and in search results, so they know what to expect before they reach out."
          />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold text-ink">Are you taking new clients?</legend>
          <div role="radiogroup" aria-label="Are you taking new clients?" className="flex flex-wrap gap-2">
            {ACCEPTING_OPTIONS.map((opt) => {
              const on = accepting === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => edit(setAccepting)(opt.value)}
                  disabled={saving}
                  className={cn(CHOICE, on ? "bg-ink text-vellum" : "bg-vellum tex-vellum text-ink hover:bg-secondary")}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          <p className="text-[13px] text-ink-muted">
            If you pick Not right now, people can still see your page but can&apos;t send a request.
          </p>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field id="pd-minimum" label="Shop minimum" hint="The smallest amount you charge for any tattoo." error={errors.shop_minimum}>
            <BoxInput id="pd-minimum" prefix="$" inputMode="numeric" value={minimum} onChange={edit(setMinimum)} maxLength={6} error={errors.shop_minimum} hint disabled={saving} />
          </Field>
          <Field id="pd-rate-min" label="Hourly rate, from" error={errors.hourly_rate_min}>
            <BoxInput id="pd-rate-min" prefix="$" inputMode="numeric" value={rateMin} onChange={edit(setRateMin)} maxLength={6} error={errors.hourly_rate_min} disabled={saving} />
          </Field>
          <Field id="pd-rate-max" label="Hourly rate, up to" error={errors.hourly_rate_max}>
            <BoxInput id="pd-rate-max" prefix="$" inputMode="numeric" value={rateMax} onChange={edit(setRateMax)} maxLength={6} error={errors.hourly_rate_max} disabled={saving} />
          </Field>
        </div>

        <Field
          id="pd-notes"
          label="Notes on pricing (optional)"
          hint="For example deposits, day rates or flash prices."
          error={errors.pricing_notes}
        >
          <BoxInput id="pd-notes" value={notes} onChange={edit(setNotes)} maxLength={LIMITS.pricingNotes} error={errors.pricing_notes} hint disabled={saving} />
        </Field>

        <div className="flex flex-col gap-1 border-t border-rule pt-3.5">
          <span className="text-[13px] font-semibold text-ink-muted">How it shows on your page</span>
          <p className="text-[15px] text-ink" aria-live="polite">
            <strong>{acceptingLabel(accepting)}</strong>.{previewPrices ? ` ${previewPrices}` : ""}
          </p>
        </div>
      </section>

      <section className={SECTION} aria-labelledby="links-heading">
        <SectionHead id="links-heading" title="Where people can find you" hint="Links show as buttons on your page. Leave any of them empty." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="pd-instagram" label="Instagram" hint="Your follower count updates from Instagram on its own." error={errors.instagram_handle}>
            <BoxInput id="pd-instagram" prefix="instagram.com/" value={instagram} onChange={edit(setInstagram)} placeholder="Not added yet" maxLength={200} error={errors.instagram_handle} hint disabled={saving} />
          </Field>
          <Field id="pd-tiktok" label="TikTok" error={errors.tiktok_handle}>
            <BoxInput id="pd-tiktok" prefix="tiktok.com/@" value={tiktok} onChange={edit(setTiktok)} placeholder="Not added yet" maxLength={200} error={errors.tiktok_handle} disabled={saving} />
          </Field>
          <Field id="pd-website" label="Website" error={errors.website}>
            <BoxInput id="pd-website" prefix="https://" inputMode="url" value={website} onChange={edit(setWebsite)} placeholder="Not added yet" maxLength={LIMITS.url} error={errors.website} disabled={saving} />
          </Field>
          <Field id="pd-booking" label="Booking link" hint="A link to your booking form or calendar, if you use one." error={errors.booking_url}>
            <BoxInput id="pd-booking" prefix="https://" inputMode="url" value={booking} onChange={edit(setBooking)} placeholder="Not added yet" maxLength={LIMITS.url} error={errors.booking_url} hint disabled={saving} />
          </Field>
        </div>
      </section>

      <div className="flex flex-col gap-1 rounded border-1.5 border-ink bg-paper px-[18px] py-4">
        <span className="text-[15px] font-semibold text-ink">Not editable here</span>
        <p className="text-sm leading-[1.5] text-ink-muted text-pretty">
          Your Verified badge, rating and reviews come from TattooMaps and your clients. To change where you work, use Where you work on this page.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-12 items-center gap-2 rounded border-1.5 border-ink bg-flash-red px-[26px] text-base font-semibold text-white hover:bg-flash-red/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-70"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Saving
            </>
          ) : (
            "Save changes"
          )}
        </button>
        <p aria-live="polite" className={cn("text-sm", formError ? "font-semibold text-flash-red" : saved ? "font-semibold text-bottle-green" : "text-ink-muted")}>
          {formError ?? (saved ? "Saved. Your public page shows the changes now." : "Changes show on your public page right away.")}
        </p>
      </div>
    </form>
  )
}
