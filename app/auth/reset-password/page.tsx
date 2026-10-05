import type { Metadata } from "next"
import { Suspense } from "react"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export const metadata: Metadata = {
  title: "Set a new password | TattooMaps",
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center">{"Loading…"}</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
