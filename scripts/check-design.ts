// check-design.ts
// Design guard for "The flash chart" (.claude/skills/tattoomaps-design).
// Scans app/, components/, lib/ and middleware.ts and fails on:
//   hex      raw hex colors outside lib/brand-colors.ts and app/globals.css
//   palette  Tailwind default palette classes (gray-500, purple-600, bg-black,
//            text-white, ...). bg-white is allowed on inputs and text-white
//            on flash red, the two places the spec allows white.
//   shadow   shadow-* classes and box/text/drop shadows (shadow-none is fine)
//   radius   rounded-lg and larger, rounded-full outside pins, avatars,
//            spinners, skeletons and slider/scrollbar parts, and arbitrary
//            radii over 4px
//   gradient gradients other than the texture hairlines and the neatline stripes
//   font     Poppins
//   copy     "·" separators and "→" / "←" arrows
// Comments are ignored. Known exceptions are listed in ALLOW below.
//
// Run: npm run check:design

import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const ROOT = process.cwd()
const SCAN = ["app", "components", "lib", "middleware.ts"]
const EXTENSIONS = /\.(ts|tsx|css|mjs|js)$/

type Rule = "hex" | "palette" | "shadow" | "radius" | "gradient" | "font" | "copy"

interface Finding {
  file: string
  line: number
  rule: Rule
  match: string
}

// Lines that may break a rule on purpose. `contains` narrows an entry to the
// lines that include that text; without it the whole file is allowed.
const ALLOW: { file: string; rule: Rule; contains?: string; why: string }[] = [
  { file: "lib/brand-colors.ts", rule: "hex", why: "the brand color source of truth" },
  { file: "app/globals.css", rule: "hex", why: "CSS variables" },
  { file: "app/globals.css", rule: "gradient", why: "texture hairline grids" },
  { file: "app/globals.css", rule: "shadow", contains: "var(--ring)", why: "map control focus ring" },
  { file: "app/globals.css", rule: "radius", contains: "9999px", why: "scrollbar thumb" },
  { file: "components/brand/neatline-frame.tsx", rule: "gradient", why: "the striped chart border" },
  { file: "lib/og/share-image.tsx", rule: "gradient", why: "hairline grid on share images" },
  { file: "components/brand/map-pin.tsx", rule: "shadow", why: "the cluster seal's double ring" },
  { file: "components/brand/map-pin.tsx", rule: "radius", why: "pins are circles" },
  { file: "components/brand/where-to-find.tsx", rule: "radius", why: "pin" },
  { file: "components/ui/avatar.tsx", rule: "radius", why: "avatars" },
  { file: "components/ui/slider.tsx", rule: "radius", why: "slider track and thumb" },
  { file: "components/ui/scroll-area.tsx", rule: "radius", why: "scrollbar thumb" },
  { file: "components/homepage/live-reviews.tsx", rule: "radius", contains: "bg-success", why: "live status dot" },
]

// rounded-full on spinners and loading placeholders for avatars.
const ROUND_OK_ON_LINE = /animate-spin|animate-pulse|<Skeleton/

const PALETTE =
  "slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose"
const UTILITY =
  "bg|text|border(?:-[trblxy])?|ring|ring-offset|outline|fill|stroke|from|via|to|divide|placeholder|decoration|accent|caret|shadow"

const CHECKS: { rule: Rule; re: RegExp; css?: boolean; skip?: (match: string, line: string, prev: string) => boolean }[] = [
  { rule: "hex", re: /(?<![\w&/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g, css: true },
  {
    rule: "palette",
    re: new RegExp(`(?<![\\w-])(?:[a-z0-9-]+:)*(?:${UTILITY})-(?:(?:${PALETTE})-\\d{2,3}|black|white)(?:\\/\\d+)?(?![\\w-])`, "g"),
    // White is only for text on flash red and for input fields.
    skip: (match, line, prev) =>
      (match.endsWith("text-white") && /flash-red|bg-primary|bg-destructive/.test(line)) ||
      (match.endsWith("bg-white") && /input|textarea|select|field/i.test(prev + line)),
  },
  { rule: "shadow", re: /(?<![\w-])(?:[a-z0-9-]+:)*(?:drop-)?shadow(?:-(?!none\b)[^\s"'`]+)?(?=[\s"'`]|$)/g },
  { rule: "shadow", re: /\b(?:box|text|drop)-shadow\s*:(?!\s*none\b)[^;]+|\b(?:boxShadow|textShadow)\s*:/g, css: true },
  { rule: "radius", re: /(?<![\w-])(?:[a-z0-9-]+:)*rounded(?:-[trblxyse]{1,2})?-(?:lg|xl|2xl|3xl|full)(?![\w-])/g },
  { rule: "radius", re: /(?<![\w-])rounded(?:-[trblxyse]{1,2})?-\[(?:[5-9]|\d{2,})(?:\.\d+)?px\]/g },
  { rule: "radius", re: /border-radius\s*:\s*(?:[5-9]|\d{2,})(?:\.\d+)?px|borderRadius\s*:\s*["'`]?(?:[5-9]|\d{2,})/g, css: true },
  { rule: "gradient", re: /(?:repeating-)?(?:linear|radial|conic)-gradient\(|(?<![\w-])bg-gradient-to-[a-z]+/g, css: true },
  { rule: "font", re: /poppins/gi, css: true },
  { rule: "copy", re: /·|→|←|&middot;|&rarr;|&larr;|\\u00[bB]7|\\u219[02]/g },
]

function walk(path: string, out: string[]) {
  const stat = statSync(path)
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) {
      if (name === "node_modules" || name.startsWith(".")) continue
      walk(join(path, name), out)
    }
  } else if (EXTENSIONS.test(path)) {
    out.push(path)
  }
}

/** Blanks out comments but keeps every newline, so line numbers still match. */
function stripComments(src: string, css: boolean): string {
  const blank = (s: string) => s.replace(/[^\n]/g, " ")
  let out = src.replace(/\/\*[\s\S]*?\*\//g, blank)
  // A // comment starts a line or follows whitespace or punctuation, which skips URLs.
  if (!css) out = out.replace(/(^|[\s;,{}()])\/\/[^\n]*/g, (m, lead: string) => lead + blank(m.slice(lead.length)))
  return out
}

function isAllowed(file: string, rule: Rule, line: string): boolean {
  return ALLOW.some((a) => a.file === file && a.rule === rule && (!a.contains || line.includes(a.contains)))
}

const files: string[] = []
for (const entry of SCAN) {
  try {
    walk(join(ROOT, entry), files)
  } catch {
    // Missing entries (e.g. no middleware.ts) are fine.
  }
}

const findings: Finding[] = []
for (const path of files) {
  const file = relative(ROOT, path).split("\\").join("/")
  const isCss = file.endsWith(".css")
  const lines = stripComments(readFileSync(path, "utf8"), isCss).split("\n")
  lines.forEach((line, i) => {
    const prev = lines.slice(Math.max(0, i - 6), i).join("\n")
    for (const check of CHECKS) {
      if (isCss && !check.css) continue
      for (const m of line.matchAll(check.re)) {
        if (isAllowed(file, check.rule, line)) continue
        if (check.skip?.(m[0], line, prev)) continue
        if (check.rule === "radius" && m[0].endsWith("rounded-full") && ROUND_OK_ON_LINE.test(line)) continue
        findings.push({ file, line: i + 1, rule: check.rule, match: m[0].trim() })
      }
    }
  })
}

if (findings.length === 0) {
  console.log(`check:design passed (${files.length} files scanned).`)
  process.exit(0)
}

findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
for (const f of findings) console.log(`${f.file}:${f.line}  ${f.rule.padEnd(8)} ${f.match}`)
console.log(
  `\ncheck:design failed: ${findings.length} problem${findings.length === 1 ? "" : "s"} in ${files.length} files.` +
    "\nSee .claude/skills/tattoomaps-design/SKILL.md (Design check) for the rules and exceptions.",
)
process.exit(1)
