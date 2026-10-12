"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Mail } from "lucide-react"
import { forgotPassword } from "@/app/(auth)/actions"
import { AUTH_HEADING, AUTH_ICON_TILE, AUTH_INPUT, AUTH_INTRO, AUTH_LABEL, AUTH_LINK, AUTH_SUBMIT, AuthNotice } from "@/components/auth/auth-ui"

export default function ForgotPasswordPage() {
  const [isPending, setIsPending] = useState(false)
  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true)
    setMessage("")
    try {
      const result = await forgotPassword(null, formData)
      if (result?.message) {
        setMessage(result.message)
        setIsSuccess(result.success === true)
      }
    } catch {
      setMessage("An error occurred. Please try again.")
      setIsSuccess(false)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="w-full">
      {/* Back link */}
      <Link
        href="/login"
        className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sign in
      </Link>

      {isSuccess ? (
        /* ── Success state ──────────────────────────────────────────── */
        <div className="space-y-6">
          <div className={AUTH_ICON_TILE}>
            <Mail className="h-7 w-7 text-bottle-green" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className={AUTH_HEADING}>
              Check your inbox
            </h1>
            <p className={AUTH_INTRO}>
              We&apos;ve sent a password reset link to your email address. It may take a
              minute or two to arrive.
            </p>
          </div>

          <AuthNotice tone="success">{message}</AuthNotice>

          <div className="space-y-3 pt-1">
            <p className="text-sm text-ink-muted">
              Didn&apos;t receive the email? Check your spam folder or{" "}
              <button
                onClick={() => {
                  setIsSuccess(false)
                  setMessage("")
                }}
                className={AUTH_LINK}
              >
                try again
              </button>
              .
            </p>
            <Link
              href="/login"
              className={`inline-flex items-center gap-1.5 text-[15px] ${AUTH_LINK}`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to sign in
            </Link>
          </div>
        </div>
      ) : (
        /* ── Request form ───────────────────────────────────────────── */
        <>
          {/* Icon + heading */}
          <div className="mb-8 space-y-4">
            <div className={AUTH_ICON_TILE}>
              <Mail className="h-7 w-7 text-ink" aria-hidden="true" />
            </div>
            <div>
              <h1 className={AUTH_HEADING}>
                Forgot your password?
              </h1>
              <p className={AUTH_INTRO}>
                No worries. Enter the email address linked to your account and we&apos;ll
                send you a secure reset link.
              </p>
            </div>
          </div>

          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className={AUTH_LABEL}>
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="alex@example.com"
                required
                disabled={isPending}
                autoFocus
                className={AUTH_INPUT}
              />
            </div>

            {/* Error feedback */}
            {message && !isSuccess && (
              <AuthNotice tone="error">{message}</AuthNotice>
            )}

            <Button
              type="submit"
              disabled={isPending}
              className={AUTH_SUBMIT}
            >
              {isPending ? "Sending reset link..." : "Send reset link"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-rule" />
            </div>
          </div>

          <p className="text-center text-[15px] text-ink-muted">
            Remember your password?{" "}
            <Link
              href="/login"
              className={AUTH_LINK}
            >
              Sign in instead
            </Link>
          </p>

          <p className="mt-3 text-center text-[15px] text-ink-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className={AUTH_LINK}
            >
              Create one for free
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
