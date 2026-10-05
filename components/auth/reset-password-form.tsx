"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, ArrowLeft, KeyRound } from "lucide-react"
import { updatePassword, verifyRecoveryLink } from "@/app/(auth)/actions"

const inputClass =
  "h-11 bg-muted/40 border-border/60 focus:border-accent focus:ring-accent/20 text-foreground placeholder:text-muted-foreground/50 rounded-xl"

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
    return <div className="py-12 text-center text-muted-foreground">{"Checking your link…"}</div>
  }

  if (linkState === "invalid") {
    return (
      <div className="w-full max-w-[420px] space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-destructive/15 border border-destructive/25 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-foreground">Link expired</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This password reset link is invalid or has expired. Request a new one and we&apos;ll email it to you.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text hover:text-accent-text/80 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Request a new reset link
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[420px]">
      <div className="mb-8 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center">
          <KeyRound className="w-7 h-7 text-accent" />
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground mb-2">Set a new password</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">Choose a password with at least 8 characters.</p>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
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
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-sm font-medium text-foreground">
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
            className={inputClass}
          />
        </div>

        {message && (
          <div className="flex items-start gap-2.5 text-sm p-3.5 rounded-xl border bg-destructive/10 border-destructive/30 text-destructive-foreground">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-11 rounded-xl font-semibold text-sm bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/25 transition-all duration-200"
        >
          {isPending ? "Saving..." : "Update password"}
        </Button>
      </form>
    </div>
  )
}
