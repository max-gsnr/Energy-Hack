# Flow Design System

A clean neutral, editorial dashboard system. It pairs a soft grey/white canvas and dark ink with a single humanist sans (Figtree) used throughout — for big stat numbers and headlines as well as functional UI text. Brand accents are **deep fathom green** and **soft dawn purple** — with *no* orange/coral as a primary.

> **Product context:** "Flow" is an AI dictation / voice-to-text product. The reference surface is its **Insights** dashboard — usage stats, words-per-minute, a desktop-app breakdown, and a streak heatmap.

## Sources

- **Reference screenshot:** `uploads/Screenshot 2026-06-13 at 06.30.40.png` — the Flow Insights view this system is reverse-engineered from.
- **Brand spec:** the `warm-minimalist-dashboard-system` v1.0 token + component + animation spec supplied with the brief (colors, type, spacing, radius, GSAP timelines).
- **`Energy-Hack/` codebase** was attached but is an **unrelated** energy/solar digital-twin project (Vite + Three.js "agent-console"). It contributed nothing to this system and is noted only so the reader knows it was reviewed.

There is no Figma file or live codebase for Flow itself — the system is built from the screenshot + written spec. Treat the screenshot as ground truth where this guide and the spec disagree.

---

## CONTENT FUNDAMENTALS

How Flow writes:

- **Voice & person.** Speaks *to* the user as **"you"** and labels things from their perspective: "Your Usage", "Your Voice", "Fixes made by Flow", "Total words dictated". The product refers to itself as "Flow".
- **Tone.** Plain, encouraging, quietly confident. Celebratory about progress ("2 day streak", "Top 4%") without being loud. No exclamation marks, no hype words.
- **Casing.**
  - Page titles & widget titles: **sentence case** ("Insights", "Desktop usage", "2 day streak").
  - Metric captions & meta: **ALL-CAPS** with wide tracking ("WORDS PER MINUTE", "TOTAL APPS USED | 15", "LONGEST STREAK | 8 DAYS").
  - Buttons & nav: **Title-ish sentence case** ("Upgrade to Pro", "Download on mobile", "Invite your team").
- **Numbers lead.** Copy is built around a metric: the big number is the headline, the caption explains it. Use thousands separators ("15,639"). Percentages and ranks get qualifiers ("Top 4%").
- **Microcopy is short & active.** Verb-first CTAs ("Upgrade", "Download", "Invite", "Get a free month"). Upsells state the value plainly: "Upgrade to Flow Pro to keep unlimited words and Pro features."
- **Pipes as separators** in meta lines: "TOTAL APPS USED | 15".
- **No emoji.** Iconography carries visual meaning instead.

---

## VISUAL FOUNDATIONS

- **Canvas.** The entire viewport is a clean neutral near-white `#fafafa`. The active view sits in a large white panel with a generous `24px` radius and a 1px neutral hairline — it floats on the canvas with margin around it, never edge-to-edge.
- **Color vibe.** Quiet, low-contrast greys at the surface level; saturated only at the accents. Fathom green `#034f46` does all the data-viz heavy lifting (gauge fills, bars, heatmap). Dawn purple `#f0d7ff` is reserved for status/trial moments. Amber glow `#ffa946` is *sparing* — a highlight, never a fill. Mint `#cef5ca` reads as low-level positive.
- **Type.** One clean humanist sans, **Figtree**, used throughout — for big stat numbers/headlines (medium weight, 500) *and* functional UI text (400/500/600). Large numbers and headlines carry a slight negative tracking (`-0.02em`). Metric captions are 11px uppercase with `0.08em` tracking. There is no serif in the system.
- **Backgrounds.** Flat color only — **no gradients, no images, no textures, no patterns.** Depth comes from the canvas → white-panel → soft-widget layering, not from shadows.
- **Cards / widgets.** Inset widgets use `--surface-soft` (#f5f5f5), `12px` radius, `24px` padding, and are **completely flat — no drop shadow.** Shadows exist (`--shadow-pop`, `--shadow-overlay`) but only for genuinely floating UI (menus, dialogs, toasts).
- **Borders.** 1px warm hairlines (`#e4e4d0`) separate the white panel from canvas and divide content within widgets. On dark surfaces, use `hairline-dark` (30% ink).
- **Corner radii.** 4px (heatmap cells, badges) · 8px (buttons, inputs) · 12px (widgets) · 16px (outer surfaces) · 24px (the main panel) · pill (rare).
- **Animation.** Fluid and confident, GSAP-style easing:
  - *Entrance:* widgets fade up from `opacity:0, y:20, scale:0.98` → settled, `0.6s power3.out`, **staggered 0.05–0.06s** top-left to bottom-right.
  - *Tab switch:* outbound `opacity:0, x:-10` (0.2s power2.in); inbound `opacity:1, x:0` from +10 (0.4s power3.out, delayed).
  - *Counters:* big numbers count 0 → value over 1.5s `expo.out`.
  - *Heatmap:* cells scale+fade in with a cascading stagger.
- **Hover states.** Sidebar rows fade in a `--surface-soft` background (0.2s). Buttons lift slightly in brightness. Data-viz cells pulse `scale: 1.1–1.18`, dimming neighbours.
- **Press states.** Buttons scale down to ~0.97 — a small, springy tap.
- **Transparency / blur.** Essentially none — this is an opaque, flat system. The only translucency is `hairline-dark` (ink at 30%).
- **Layout rules.** Fixed left sidebar (~256px) on the canvas; scrolling white content panel to its right; a slim top bar with sidebar-toggle (left) and notifications + account (right).

---

## ICONOGRAPHY

- **System:** [Lucide](https://lucide.dev) — clean, geometric, **outline** icons at ~1.9 stroke weight, sized 18–21px in the UI. This matches the reference screenshot's thin single-stroke icons (panel-left, bell, user, layout-grid, book-open, scissors, etc.).
  - **Substitution flag:** Flow's real icons are not in any supplied asset, so Lucide is used as the closest-matching outline set. Loaded from CDN (`unpkg.com/lucide`). Swap for the official set if/when provided.
- **Color.** Icons inherit `--ink-secondary` at rest, `--ink-primary` when active, and `--accent-primary` for affirmative/brand glyphs. Inside the green usage bars, icons sit in ink to the *left* of the track, never reversed out.
- **Logo.** `assets/flow-logo.svg` — a small five-bar equalizer mark (one bar in fathom green) beside the "Flow" sans wordmark. **This is a clean recreation, not the official logo** — replace with the real asset when available.
- **No emoji, no unicode glyphs as icons.** Decorative marks (e.g. the rotating "SHARE · SHARE" share stamp) are built from real type on a path, not emoji.

---

## INDEX

Root manifest:

- **`styles.css`** — the single entry point consumers link. `@import`s everything below.
- **`tokens/`** — `colors.css`, `typography.css`, `spacing.css` (incl. radius, elevation, motion), `fonts.css` (Google Fonts), `base.css` (element defaults).
- **`assets/`** — `flow-logo.svg`.
- **`components/`** — reusable React primitives (read off `window.FlowDesignSystem_96ad7f`):
  - `core/` — **Button**, **Badge**
  - `navigation/` — **Tabs**, **SidebarItem**
  - `layout/` — **Widget**
  - `data/` — **StatCard**, **ProgressGauge**, **ProgressBar**, **Heatmap**
- **`ui_kits/flow-insights/`** — full interactive recreation of the Insights dashboard.
- **`guidelines/`** — foundation specimen cards (Colors, Type, Spacing) shown in the Design System tab.
- **`SKILL.md`** — Agent-Skill manifest for using this system elsewhere.

Each component directory also carries a `.d.ts` (props), `.prompt.md` (usage), and a `@dsCard` HTML showcase.
