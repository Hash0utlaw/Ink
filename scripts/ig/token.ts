// scripts/ig/token.ts — Step 5 setup: Meta token and Instagram business account.
//
// Reads META_APP_ID, META_APP_SECRET and META_USER_TOKEN from .env.local and
// writes back (never printing any of them):
//   META_LONG_TOKEN       long-lived user token (grant_type=fb_exchange_token)
//   IG_BUSINESS_ID        the Instagram business account behind one of your Pages
//   META_GRAPH_VERSION    newest Graph API version this app answers on
// Prints only the token's expiry date, the Page name and the Instagram username.
// If the exchange fails or no Instagram business account is linked, it stops
// and says what to fix in Meta.
//
// Run: npx tsx scripts/ig/token.ts

import { config } from "dotenv"
config({ path: ".env.local", quiet: true })

import { graphGet, requireEnv, setEnvVar, type GraphError } from "./lib"

const NEEDED_SCOPES = ["instagram_basic", "pages_show_list"]

function stop(lines: string[]): never {
  console.error("\nSTOPPED.\n" + lines.map((l) => `  ${l}`).join("\n"))
  process.exit(1)
}

const describe = (e: GraphError) => `${e.message}${e.code ? ` (code ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ""})` : ""}`

// The unversioned API answers with the app's default version in a header; the
// app may also accept newer ones, so try a few above it.
async function latestVersion(token: string): Promise<string> {
  const base = await graphGet<{ id: string }>("me", { fields: "id", access_token: token })
  const header = base.headers.get("facebook-api-version") ?? ""
  const m = /^v(\d+)\.0$/.exec(header)
  if (!m) return process.env.META_GRAPH_VERSION?.trim() || "v24.0"
  let best = Number(m[1])
  for (let v = best + 1; v <= best + 5; v++) {
    const r = await graphGet<{ id: string }>(`v${v}.0/me`, { fields: "id", access_token: token })
    if (r.status === 200 && !("error" in r.body && r.body.error)) best = v
    else break
  }
  return `v${best}.0`
}

interface DebugData {
  is_valid: boolean
  expires_at?: number
  data_access_expires_at?: number
  scopes?: string[]
  type?: string
}

async function debugToken(version: string, token: string, appToken: string): Promise<DebugData | null> {
  const r = await graphGet<{ data: DebugData }>(`${version}/debug_token`, { input_token: token, access_token: appToken })
  return "error" in r.body && r.body.error ? null : (r.body as { data: DebugData }).data
}

async function main() {
  const appId = requireEnv("META_APP_ID")
  const appSecret = requireEnv("META_APP_SECRET")
  const userToken = requireEnv("META_USER_TOKEN")
  const appToken = `${appId}|${appSecret}`

  const version = await latestVersion(userToken).catch(() => process.env.META_GRAPH_VERSION?.trim() || "v24.0")

  // 1. Exchange the short-lived token for a long-lived one.
  const ex = await graphGet<{ access_token: string; expires_in?: number }>(`${version}/oauth/access_token`, {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: userToken,
  })
  let longToken: string
  if ("error" in ex.body && ex.body.error) {
    const e = ex.body.error
    // A long-lived token saved by an earlier run is fine to keep using.
    const saved = process.env.META_LONG_TOKEN?.trim()
    const savedInfo = saved ? await debugToken(version, saved, appToken) : null
    if (saved && savedInfo?.is_valid) {
      console.log(`Token exchange failed (${describe(e)}), but the long-lived token saved earlier is still valid; keeping it.`)
      longToken = saved
    } else if (e.code === 190) {
      stop([
        `Meta says the token in META_USER_TOKEN is expired or invalid: ${describe(e)}`,
        "Fix: open developers.facebook.com/tools/explorer, pick your app, click Generate Access Token,",
        "grant instagram_basic, pages_show_list, pages_read_engagement and business_management,",
        "then paste the new token into .env.local as META_USER_TOKEN and run this again.",
      ])
    } else if (e.code === 101 || e.code === 1 || /secret|client_id|app id/i.test(e.message)) {
      stop([
        `Meta rejected the app credentials: ${describe(e)}`,
        "Fix: check META_APP_ID and META_APP_SECRET in .env.local against",
        "developers.facebook.com > your app > App settings > Basic (App ID and App secret).",
        "The token must also have been generated for this same app.",
      ])
    } else {
      stop([`Meta refused the token exchange: ${describe(e)}`, "Fix: generate a fresh user token for this app in the Graph API Explorer and run this again."])
    }
  } else {
    longToken = (ex.body as { access_token: string }).access_token
  }

  const info = await debugToken(version, longToken, appToken)
  if (!info?.is_valid) stop(["The long-lived token isn't valid according to Meta's debug_token.", "Fix: generate a fresh user token for this app and run this again."])
  const missing = NEEDED_SCOPES.filter((s) => !info.scopes?.includes(s))

  setEnvVar("META_LONG_TOKEN", longToken)
  setEnvVar("META_GRAPH_VERSION", version)

  // 2. Find the Instagram business account behind one of the user's Pages.
  const acc = await graphGet<{ data: { id: string; name: string; instagram_business_account?: { id: string; username?: string } }[] }>(
    `${version}/me/accounts`,
    { fields: "name,instagram_business_account{id,username}", limit: "100", access_token: longToken },
  )
  if ("error" in acc.body && acc.body.error) {
    stop([
      `Meta refused to list your Facebook Pages: ${describe(acc.body.error)}`,
      "Fix: regenerate the user token with pages_show_list and business_management granted, and run this again.",
    ])
  }
  const pages = (acc.body as { data: { name: string; instagram_business_account?: { id: string; username?: string } }[] }).data ?? []
  const linked = pages.filter((p) => p.instagram_business_account?.id)
  if (!linked.length) {
    stop([
      pages.length
        ? `Found ${pages.length} Facebook Page(s), but none has an Instagram business account linked.`
        : "This token can't see any Facebook Page.",
      "Fix in Meta:",
      "  1. In the Instagram app, switch the account to Professional (Business or Creator).",
      "  2. Link it to a Facebook Page: Meta Business Suite > Settings > Linked accounts > Instagram,",
      "     or Facebook Page > Settings > Linked accounts.",
      "  3. Generate a new user token and, in the login dialog, tick that Page and Instagram account.",
      ...(missing.length ? [`  The current token is also missing: ${missing.join(", ")}. Grant them when you regenerate it.`] : []),
      "  Then paste it into .env.local as META_USER_TOKEN and run this again.",
    ])
  }
  const pick = linked[0]
  const ig = pick.instagram_business_account!
  setEnvVar("IG_BUSINESS_ID", ig.id)

  const expiry = info.expires_at ? new Date(info.expires_at * 1000).toISOString().slice(0, 10) : "never (no expiry set)"
  console.log(`Token expires:      ${expiry}`)
  console.log(`Facebook Page:      ${pick.name}`)
  console.log(`Instagram account:  @${ig.username ?? "(username not returned)"}`)
  console.log(`Graph API version:  ${version}`)
  if (linked.length > 1) console.log(`(${linked.length} Pages have Instagram linked; using the first. Others: ${linked.slice(1).map((p) => p.name).join(", ")})`)
  if (missing.length) console.log(`Warning: token is missing ${missing.join(", ")}; lookups may be refused.`)
  console.log("Saved META_LONG_TOKEN, IG_BUSINESS_ID and META_GRAPH_VERSION to .env.local.")
}

main().catch((e) => {
  console.error((e as Error).message)
  process.exit(1)
})
