/**
 * Summit Dashboard — Theme Tokens
 * v1 — 2026-02-26
 *
 * Usage:
 *   import { DARK, LIGHT, getTheme } from '@/lib/theme'
 *
 * All components receive the theme object as `T` via ThemeContext.
 * Never hardcode colors — always reference T.{token}.
 */

// ── DARK THEME ────────────────────────────────────────────
export const DARK = {
  id: "dark",

  // Surfaces
  bg:       "#0b0f0d",   // True background — near black, green-tinted
  bg2:      "#101510",   // Elevated surface — insets, collapsed sections
  surface:  "#141a14",   // Interactive surface — hover states
  line:     "#1c2a1e",   // Dividers, borders, grid lines
  inkFaint: "#1e2b20",   // Near-invisible — empty bar tracks

  // Text hierarchy (three levels only — do not add more)
  ink:      "#dde8dd",   // Primary — warm white-green
  inkMid:   "#8a9e8c",   // Secondary — labels, descriptions
  inkDim:   "#445847",   // Tertiary — muted, disabled, axes

  // Semantic accents
  moss:     "#5c9469",   // Primary — active, actionable, good state
  mossHi:   "#82c991",   // Highlight — positive delta, high stimulus
  sand:     "#c9b97a",   // Objective — approaching indicators
  warn:     "#c47a3a",   // Fatigue — volume flags, recovery alerts

  // Decorative (never on text or data)
  grid:     "#162018",   // Survey grid lines and dots
};

// ── LIGHT THEME ───────────────────────────────────────────
export const LIGHT = {
  id: "light",

  // Surfaces
  bg:       "#f2f0eb",   // Warm off-white — paper, not stark white
  bg2:      "#eae8e2",   // Slightly recessed surface
  surface:  "#e4e1da",   // Interactive surface
  line:     "#d0ccc2",   // Dividers — warm grey
  inkFaint: "#dddad3",   // Empty bar tracks, faint backgrounds

  // Text hierarchy
  ink:      "#1a201b",   // Primary — near black, green-tinted
  inkMid:   "#6b6558",   // Secondary
  inkDim:   "#9a9489",   // Tertiary

  // Semantic accents (darkened for light-bg contrast)
  moss:     "#3d7a4e",   // Primary accent
  mossHi:   "#2e6040",   // Highlight — darker than moss on light bg
  sand:     "#8a7340",   // Objective
  warn:     "#a05a20",   // Fatigue

  // Decorative
  grid:     "#dddad3",   // Survey grid — subtle on warm white
};

// ── HELPERS ───────────────────────────────────────────────

/**
 * Returns the theme object for a given theme id.
 * @param {"dark"|"light"} id
 */
export function getTheme(id) {
  return id === "light" ? LIGHT : DARK;
}

/**
 * Reads persisted theme preference from localStorage.
 * Defaults to "light" if not set.
 * @returns {"dark"|"light"}
 */
export function getStoredTheme() {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem("summitTheme") || "light";
}

/**
 * Persists theme preference to localStorage.
 * @param {"dark"|"light"} id
 */
export function setStoredTheme(id) {
  if (typeof window !== "undefined") {
    localStorage.setItem("summitTheme", id);
  }
}

// ── TYPOGRAPHY ────────────────────────────────────────────
// Reference only — not applied via JS, use in CSS/Tailwind classes
export const TYPE = {
  serif:      "'DM Serif Display', serif",
  sans:       "'DM Sans', -apple-system, sans-serif",

  displayXl:  { fontFamily: "'DM Serif Display', serif", fontSize: 32, letterSpacing: "-0.03em", fontWeight: 400 },
  displayLg:  { fontFamily: "'DM Serif Display', serif", fontSize: 24, letterSpacing: "-0.02em", fontWeight: 400 },
  displayMd:  { fontFamily: "'DM Serif Display', serif", fontSize: 18, letterSpacing: "-0.01em", fontWeight: 400 },
  displayNum: { fontFamily: "'DM Serif Display', serif", fontSize: 28, letterSpacing: "-0.03em", fontWeight: 400 },

  label:      { fontFamily: "'DM Sans', sans-serif", fontSize: 8,  fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" },
  body:       { fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 400, letterSpacing: "0.01em" },
  bodySm:     { fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 400, letterSpacing: "0.03em" },
  monoData:   { fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "0.02em", fontVariantNumeric: "tabular-nums" },
  caption:    { fontFamily: "'DM Sans', sans-serif", fontSize: 9,  fontWeight: 400, letterSpacing: "0.08em" },
};

// ── SPACING ───────────────────────────────────────────────
export const SPACE = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  22,
  xxl: 28,
  "3xl": 32,
};

// ── TOPO RENDERING CONSTANTS ──────────────────────────────
export const TOPO = {
  strokeWidth:    0.75,
  opacityMin:     0.18,   // opacity at lowest elevation contour
  opacityMax:     0.60,   // opacity at highest elevation contour
  viewPadding:    0.05,   // 5% padding in SVG projection
  preserveAspect: "xMidYMid slice",

  /**
   * Returns stroke opacity for a given elevation within a range.
   * @param {number} elev - current contour elevation
   * @param {number} minElev - lowest elevation in the set
   * @param {number} maxElev - highest elevation in the set
   */
  opacity(elev, minElev, maxElev) {
    const t = (elev - minElev) / (maxElev - minElev || 1);
    return this.opacityMin + t * (this.opacityMax - this.opacityMin);
  },
};

// ── SURVEY GRID CONSTANTS ─────────────────────────────────
export const GRID = {
  spacing:      28,     // px between grid lines
  strokeWidth:  0.5,
  dashArray:    "1,3",
  dotRadius:    0.8,
  heroOpacity:  0.40,   // behind hero section
  objOpacity:   0.25,   // behind objective card
};
