// Hex values of the brand tokens, for places that can't read CSS variables.
// Mapbox GL paint properties are evaluated in WebGL, outside the DOM, so they
// need literal colors. This is the only file where brand hex values may live;
// everything rendered as HTML or SVG uses the CSS variables in app/globals.css
// (via Tailwind names like bg-paper, fill-ink). Keep these in sync with
// .claude/skills/tattoomaps-design/SKILL.md.
export const MAP_COLORS = {
  paper: "#EFE4CC",
  vellum: "#FBF6EA",
  ink: "#221A14",
  navy: "#1F3350",
  flashRed: "#B3261E",
  flashYellow: "#D9A426",
  bottleGreen: "#2F6B4F",
} as const

export type MapColor = keyof typeof MAP_COLORS
