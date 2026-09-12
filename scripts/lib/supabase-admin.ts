// scripts/lib/supabase-admin.ts
// Shared service-role Supabase client for standalone scripts. Reads env vars
// lazily (inside the function, not at module top level) so it's safe to
// import before the entrypoint's dotenv config({ path: ".env.local" }) call
// has run — ES module evaluation order runs this module's body before the
// importing script's own top-level statements, but env vars are only read
// when getSupabaseAdmin() is actually called from main().

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export function getSupabaseAdmin(): SupabaseClient {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Missing env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env.local")
    process.exit(1)
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY.trim())
}
