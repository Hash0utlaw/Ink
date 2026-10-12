"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Palette, Search, Eye, EyeOff } from "lucide-react"
import { login, signup } from "@/app/(auth)/actions"
import { cn } from "@/lib/utils"
import { AUTH_HEADING, AUTH_INPUT, AUTH_INTRO, AUTH_LABEL, AUTH_LINK, AUTH_SECONDARY, AUTH_SUBMIT, AuthNotice } from "./auth-ui"

interface AuthFormProps {
  mode: "login" | "signup"
}

export function AuthForm({ mode }: AuthFormProps) {
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? ""
  const [message, setMessage] = useState(() => {
    if (mode === "login" && searchParams.get("reset") === "1") {
      return "Password updated. Log in with your new password."
    }
    if (mode === "login" && searchParams.get("error") === "confirm_failed") {
      return "That link expired or was already used. Try logging in, or sign up again."
    }
    return searchParams.get("message") || ""
  })
  const [isSuccess, setIsSuccess] = useState(() => mode === "login" && searchParams.get("reset") === "1")
  const [isPending, setIsPending] = useState(false)
  const [selectedRole, setSelectedRole] = useState<"artist" | "client" | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true)
    setMessage("")
    try {
      const action = mode === "login" ? login : signup
      const result = await action(null, formData)
      if (result?.message) {
        // Treat confirmation messages as success
        const msg: string = result.message
        if (msg.toLowerCase().includes("check") || msg.toLowerCase().includes("confirm")) {
          setIsSuccess(true)
        }
        setMessage(msg)
      }
    } catch {
      setMessage("An error occurred. Please try again.")
    } finally {
      setIsPending(false)
    }
  }

  const isLogin = mode === "login"

  return (
    <div className="w-full">
      {/* Heading */}
      <div className="mb-7">
        <h1 className={AUTH_HEADING}>
          {isLogin ? "Welcome back" : "Create account"}
        </h1>
        <p className={AUTH_INTRO}>
          {isLogin
            ? "Sign in to your TattooMaps account to continue."
            : "Join the TattooMaps community and start your journey."}
        </p>
      </div>

      {/* Form */}
      <form action={handleSubmit} className="space-y-5">
        <input type="hidden" name="next" value={next} />
        {/* Full name (signup only) */}
        {!isLogin && (
          <div className="space-y-1.5">
            <Label htmlFor="name" className={AUTH_LABEL}>
              Full name
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Alex Doe"
              required
              disabled={isPending}
              className={AUTH_INPUT}
            />
          </div>
        )}

        {/* Email */}
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
            className={AUTH_INPUT}
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className={AUTH_LABEL}>
              Password
            </Label>
            {isLogin && (
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-navy underline underline-offset-2 hover:no-underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder={isLogin ? "Enter your password" : "Min. 8 characters"}
              required
              disabled={isPending}
              className={`${AUTH_INPUT} pr-11`}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-ink-muted hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Role selector (signup only) */}
        {!isLogin && (
          <div className="space-y-2">
            <Label className={AUTH_LABEL}>I am joining as...</Label>
            <input type="hidden" name="role" value={selectedRole ?? ""} />
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  {
                    role: "artist" as const,
                    icon: Palette,
                    title: "An Artist",
                    sub: "Showcase & grow your portfolio",
                  },
                  {
                    role: "client" as const,
                    icon: Search,
                    title: "A Client",
                    sub: "Discover & book artists",
                  },
                ] as const
              ).map(({ role, icon: Icon, title, sub }) => {
                const active = selectedRole === role
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    aria-pressed={active}
                    disabled={isPending}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded border-1.5 border-ink p-4 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "bg-ink text-vellum" : "bg-vellum tex-vellum text-ink hover:bg-secondary",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <div>
                      <div className="text-[15px] font-semibold leading-tight">{title}</div>
                      <div className={cn("mt-0.5 text-[13px] leading-tight", active ? "text-vellum/80" : "text-ink-muted")}>
                        {sub}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Feedback message */}
        {message && <AuthNotice tone={isSuccess ? "success" : "error"}>{message}</AuthNotice>}

        {/* Submit */}
        <Button
          type="submit"
          className={AUTH_SUBMIT}
          disabled={isPending || (!isLogin && selectedRole === null)}
        >
          {isPending
            ? "Processing..."
            : isLogin
            ? "Sign in to TattooMaps"
            : "Create my account"}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-7">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-rule" />
        </div>
        <div className="relative flex justify-center text-[13px]">
          <span className="bg-vellum px-3 text-ink-muted">
            or continue with
          </span>
        </div>
      </div>

      {/* Social buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          disabled={isPending}
          className={AUTH_SECONDARY}
        >
          <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg">
            <title>Google</title>
            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.62-4.55 1.62-3.87 0-7-3.13-7-7s3.13-7 7-7c2.04 0 3.92.82 5.24 2.1l3.15-3.15C18.82.76 15.96 0 12.48 0 5.88 0 0 5.88 0 12.48s5.88 12.48 12.48 12.48c7.28 0 12.12-4.87 12.12-12.36 0-.8-.08-1.48-.2-2.16H12.48z" />
          </svg>
          Google
        </Button>
        <Button
          variant="outline"
          disabled={isPending}
          className={AUTH_SECONDARY}
        >
          <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg">
            <title>GitHub</title>
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
          GitHub
        </Button>
      </div>

      {/* Switch mode link */}
      <p className="mt-7 text-center text-[15px] text-ink-muted">
        {isLogin ? "New to TattooMaps?" : "Already have an account?"}{" "}
        <Link
          href={`${isLogin ? "/signup" : "/login"}${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className={AUTH_LINK}
        >
          {isLogin ? "Create a free account" : "Sign in instead"}
        </Link>
      </p>
    </div>
  )
}
