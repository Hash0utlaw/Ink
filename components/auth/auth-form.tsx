"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Palette, Search, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"
import { login, signup } from "@/app/(auth)/actions"
import { cn } from "@/lib/utils"

interface AuthFormProps {
  mode: "login" | "signup"
}

export function AuthForm({ mode }: AuthFormProps) {
  const searchParams = useSearchParams()
  const [message, setMessage] = useState(searchParams.get("message") || "")
  const [isSuccess, setIsSuccess] = useState(false)
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
    <div className="w-full max-w-[420px]">
      {/* Heading */}
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-foreground mb-2">
          {isLogin ? "Welcome back" : "Create account"}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {isLogin
            ? "Sign in to your TattooMaps account to continue."
            : "Join the TattooMaps community and start your journey."}
        </p>
      </div>

      {/* Form */}
      <form action={handleSubmit} className="space-y-5">
        {/* Full name (signup only) */}
        {!isLogin && (
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-medium text-foreground">
              Full name
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Alex Doe"
              required
              disabled={isPending}
              className="h-11 bg-muted/40 border-border/60 focus:border-accent focus:ring-accent/20 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
            />
          </div>
        )}

        {/* Email */}
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
            className="h-11 bg-muted/40 border-border/60 focus:border-accent focus:ring-accent/20 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            {isLogin && (
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-accent transition-colors"
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
              className="h-11 bg-muted/40 border-border/60 focus:border-accent focus:ring-accent/20 text-foreground placeholder:text-muted-foreground/50 rounded-xl pr-11"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Role selector (signup only) */}
        {!isLogin && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">I am joining as...</Label>
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
                    disabled={isPending}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      active
                        ? "border-accent bg-accent/10 shadow-sm shadow-accent/20"
                        : "border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-border",
                    )}
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center",
                        active ? "bg-accent/20" : "bg-muted",
                      )}
                    >
                      <Icon className={cn("h-4.5 w-4.5", active ? "text-accent" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <div
                        className={cn(
                          "text-sm font-semibold leading-tight",
                          active ? "text-accent" : "text-foreground",
                        )}
                      >
                        {title}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{sub}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Feedback message */}
        {message && (
          <div
            className={cn(
              "flex items-start gap-2.5 text-sm p-3.5 rounded-xl border",
              isSuccess
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-destructive/10 border-destructive/30 text-destructive-foreground",
            )}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{message}</span>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-11 rounded-xl font-semibold text-sm bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/25 transition-all duration-200"
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
          <span className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background lg:bg-secondary/30 px-3 text-muted-foreground tracking-wider">
            or continue with
          </span>
        </div>
      </div>

      {/* Social buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          disabled={isPending}
          className="h-11 rounded-xl border-border/60 bg-muted/30 hover:bg-muted/60 text-foreground font-medium"
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
          className="h-11 rounded-xl border-border/60 bg-muted/30 hover:bg-muted/60 text-foreground font-medium"
        >
          <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg">
            <title>GitHub</title>
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
          GitHub
        </Button>
      </div>

      {/* Switch mode link */}
      <p className="mt-7 text-center text-sm text-muted-foreground">
        {isLogin ? "New to TattooMaps?" : "Already have an account?"}{" "}
        <Link
          href={isLogin ? "/signup" : "/login"}
          className="font-semibold text-accent hover:text-accent/80 transition-colors"
        >
          {isLogin ? "Create a free account" : "Sign in instead"}
        </Link>
      </p>
    </div>
  )
}
