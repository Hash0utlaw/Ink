import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isAdmin, isDesignReferenceOpen } from "@/lib/admin"
import {
  COMING_SOON_PATH,
  GATE_ADMIN_COOKIE,
  isAllowedWhileGated,
  isLaunchGateOn,
} from "@/lib/launch-gate"

// Coming-soon gate: returns the coming-soon rewrite (pages) or a 404 (API) for
// non-admins while the gate is on, or null to let the request through. Any
// refreshed Supabase auth cookies on `response` are carried over.
function applyLaunchGate(request: NextRequest, response: NextResponse, email: string | null | undefined) {
  if (!isLaunchGateOn() || isAdmin(email)) return null
  const { pathname } = request.nextUrl
  if (isAllowedWhileGated(pathname)) return null

  const gated = pathname.startsWith("/api/")
    ? new NextResponse(null, { status: 404 })
    : NextResponse.rewrite(new URL(COMING_SOON_PATH, request.url))
  gated.headers.set("X-Robots-Tag", "noindex, nofollow")
  response.cookies.getAll().forEach((cookie) => gated.cookies.set(cookie))
  if (request.cookies.has(GATE_ADMIN_COOKIE)) gated.cookies.delete(GATE_ADMIN_COOKIE)
  return gated
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return applyLaunchGate(request, response, null) ?? response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  // Refreshes the auth token if it's expired — required for Server
  // Components, which cannot write cookies themselves.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const gated = applyLaunchGate(request, response, user?.email)
  if (gated) return gated

  // Tells the client-side admin banner to show. It's only a display hint —
  // access is decided above on every request.
  if (isLaunchGateOn() && isAdmin(user?.email)) {
    response.cookies.set(GATE_ADMIN_COOKIE, "1", { path: "/", sameSite: "lax" })
  } else if (request.cookies.has(GATE_ADMIN_COOKIE)) {
    response.cookies.delete(GATE_ADMIN_COOKIE)
  }

  const { pathname } = request.nextUrl
  const isProtected = pathname.startsWith("/dashboard") || pathname.startsWith("/artist-dashboard")

  // Admin pages don't advertise themselves: signed-out visitors get a plain 404.
  // The page itself still checks ADMIN_EMAILS for signed-in users. The design
  // reference is the one exception, and only on previews and in development.
  const openDesignReference = pathname === "/admin/design" && isDesignReferenceOpen()
  if (pathname.startsWith("/admin") && !user && !openDesignReference) {
    return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 })
  }

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimization files.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
