import type React from "react"
import Image from "next/image"
import Link from "next/link"

/**
 * Login, sign up, forgot and reset password: one centered vellum card (max
 * 440px) on the paper page, with the ink wordmark above it.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-paper tex-paper px-4 py-10 sm:py-16">
      <Link href="/" aria-label="TattooMaps home" className="inline-flex min-h-11 items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Image src="/brand/logo-wordmark-ink.webp" alt="TattooMaps" width={70} height={40} className="h-10 w-auto" priority />
      </Link>

      <div className="mt-6 w-full max-w-[440px] rounded border-1.5 border-ink bg-vellum tex-vellum p-6 sm:p-8">
        {children}
      </div>

      <p className="mt-6 max-w-[440px] text-center text-[13px] leading-[1.5] text-ink-muted">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}
