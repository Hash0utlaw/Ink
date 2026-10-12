"use client"

import { useRouter } from "next/navigation"
import { getClient } from "@/utils/supabase/client"

/** Signs the user out of Supabase and sends them to the homepage. */
export function useSignOut() {
  const router = useRouter()

  return async () => {
    const supabase = getClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push("/")
  }
}
