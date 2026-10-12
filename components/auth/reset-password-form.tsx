"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, ArrowLeft, KeyRound } from "lucide-react"
import { updatePassword, verifyRecoveryLink } from "@/app/(auth)/actions"
import { AUTH_HEADING, AUTH_ICON_TILE, AUTH_INPUT, AUTH_INTRO, AUTH_LABEL, AUTH_LINK, AUTH_SUBMIT, AuthNotice } from "./auth-ui"


export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const [linkState, setLinkState] = useState<"checking" | "valid" | "invalid">("checking")
  const [isPending, setIsPending] = useState(false)
  const [message, setMessage] = useState("")
  const verified = useRef(false)

  useEffect(() => {
    // Reset links are single-use; guard against effects running twice in dev.
    if (verified.current) return
    verified.current = true
    verifyRecoveryLink({
      code: searchParams.get("code"),
      tokenHash: searchParams.get("token_hash"),
      type: searchParams.get("type"),
    })
      .then((result) => setLinkState(result.ok ? "valid" : "invalid"))
      .catch(() => setLinkState("invalid"))
  }, [searchParams])

  const handleSubmit = async (formData: FormData) => {
    const password = (formData.get("password") as string) ?? ""
    if (password.length < 8) return setMessage("Password must be at least 8 characters.")
    if (password !== formData.get("confirm")) return setMessage("Passwords don't match.")

    setIsPending(true)
    setMessage("")
    try {
      // Redirects to /login?reset=1 on success.
      const result = await updatePassword(null, formData)
      if (result?.message) setMessage(result.message)
    } catch {
      setMessage("An error occurred. Please try again.")
    } finally {
      setIsPending(false)
    }
  }

  if (linkState === "checking") {
    return <div className="py-12 text-center text-ink-muted">{"Checking your link…"}</div>
  }

  if (linkState === "invalid") {
    return (
      <div className="w-full space-y-6">
        <div className={AUTH_ICON_TILE}>
          <AlertCircle className="h-7 w-7 text-ink" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className={AUTH_HEADING}>Link expired</h1>
          <p className={AUTH_INTRO}>
            This password reset link is invalid or has expired. Request a new one and we&apos;ll email it to you.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className={`inline-flex items-center gap-1.5 text-[15px] ${AUTH_LINK}`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Request a new reset link
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-8 space-y-4">
        <div className={AUTH_ICON_TILE}>
          <KeyRound className="h-7 w-7 text-ink" aria-hidden="true" />
        </div>
        <div>
          <h1 className={AUTH_HEADING}>Set a new password</h1>
          <p className={AUTH_INTRO}>Choose a password with at least 8 characters.</p>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="password" className={AUTH_LABEL}>
            New password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Min. 8 characters"
            minLength={8}
            required
            disabled={isPending}
            autoFocus
            autoComplete="new-password"
            className={AUTH_INPUT}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm" className={AUTH_LABEL}>
            Confirm new password
          </Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            placeholder="Re-enter your password"
            minLength={8}
            required
            disabled={isPending}
            autoComplete="new-password"
            className={AUTH_INPUT}
          />
        </div>

        {message && (
          <AuthNotice tone="error">{message}</AuthNotice>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className={AUTH_SUBMIT}
        >
          {isPending ? "Saving..." : "Update password"}
        </Button>
      </form>
    </div>
  )
}
