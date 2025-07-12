import { Suspense } from "react"
import { AuthForm } from "@/components/auth/auth-form"

// Server Component
export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center">{"Loading…"}</div>}>
      <AuthForm mode="signup" />
    </Suspense>
  )
}
