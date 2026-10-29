"use client"

import { useId } from "react"
import { HONEYPOT_FIELD } from "@/lib/validation"

/**
 * A field people never see. Bots that fill in every input fill this one too,
 * and the API quietly drops their submission. Send its value as `hp`.
 */
export function Honeypot({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId()
  return (
    <div aria-hidden="true" className="sr-only">
      <label htmlFor={id}>Leave this field empty</label>
      <input
        id={id}
        type="text"
        name={`${HONEYPOT_FIELD}_contact_me_by_fax_only`}
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
