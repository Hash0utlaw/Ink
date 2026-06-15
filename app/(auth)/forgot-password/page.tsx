"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from "lucide-react"
import { forgotPassword } from "@/app/(auth)/actions"
import { cn } from "@/lib/utils"

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
    <div className="w-full max-w-[420px]">
      {/* Back link */}
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sign in
      </Link>

      {isSuccess ? (
        /* ── Success state ──────────────────────────────────────────── */
        <div className="space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <Mail className="w-7 h-7 text-emerald-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-foreground">
              Check your inbox
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We&apos;ve sent a password reset link to your email address. It may take a
              minute or two to arrive.
            </p>
          </div>

          <div className="flex items-start gap-2.5 text-sm p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>

          <div className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground">
              Didn&apos;t receive the email? Check your spam folder or{" "}
              <button
                onClick={() => {
                  setIsSuccess(false)
                  setMessage("")
                }}
                className="text-accent hover:text-accent/80 font-medium transition-colors"
              >
                try again
              </button>
              .
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
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
            <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center">
              <Mail className="w-7 h-7 text-accent" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-foreground mb-2">
                Forgot your password?
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                No worries. Enter the email address linked to your account and we&apos;ll
                send you a secure reset link.
              </p>
            </div>
          </div>

          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
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
                className="h-11 bg-muted/40 border-border/60 focus:border-accent focus:ring-accent/20 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
              />
            </div>

            {/* Error feedback */}
            {message && !isSuccess && (
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
              {isPending ? "Sending reset link..." : "Send reset link"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-semibold text-accent hover:text-accent/80 transition-colors"
            >
              Sign in instead
            </Link>
          </p>

          <p className="mt-3 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-accent hover:text-accent/80 transition-colors"
            >
              Create one for free
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
