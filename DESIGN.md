# Curio — Design System

Normative. Read before any visual decision. Deviations require explicit approval.
Source of truth for tokens: `src/app/globals.css`. This document explains *why*;
the CSS is *what*. If they disagree, the CSS is a bug.

---

## 1. Feel

**Modern · premium · artistic · minimal · warm · editorial · trustworthy.**

The product is a gallery wall, not a dashboard. The page is the mat board; the
artwork is the art. Every decision below follows from one rule:

> **The artwork provides the colour. The UI does not compete with it.**

### Explicitly banned

- Generic SaaS chrome: card shadows stacked three deep, blue-600 primary buttons,
  sidebar-with-icons layouts.
- Gradient meshes, glassmorphism, neon, glow, "aurora" backgrounds.
- Stock photography of people in apartments.
- Emoji as UI iconography.
- Purple→pink gradients on headings. Full stop.
- Rounded-full pills on anything except tag chips.
- Text set over artwork.
- Cropping artwork to a uniform square (§35.4). This is the one visual sin the
  product cannot commit — it destroys an artist's composition.

---

## 2. Colour tokens

Warm off-white ground, near-black ink, exactly **one** accent.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FAF8F5` | Page ground. Warm off-white, never `#fff`. |
| `--surface` | `#FFFFFF` | Cards, panels, modals — lifts off `--bg` without shadow. |
| `--surface-sunk` | `#F2EFEA` | Wells, image placeholders, skeletons, table zebra. |
| `--border` | `#E4DFD8` | Every hairline. 1px, never 2px. |
| `--border-strong` | `#D4CCC1` | Hover/focus borders, table rules under headers. |
| `--text` | `#1A1815` | Body ink. Near-black, never pure black. |
| `--text-muted` | `#6B6560` | Secondary. **4.9:1 on `--bg`** — verified, body-safe. |
| `--text-faint` | `#8A837C` | Tertiary only, ≥16px or bold. 3.3:1 — large text only. |
| `--accent` | `#8B5E3C` | Muted terracotta. The only accent. 5.6:1 on `--bg`. |
| `--accent-hover` | `#744C2F` | Accent interactive state. |
| `--accent-soft` | `#F0E6DE` | Accent-tinted fill: chips, selected states. |
| `--success` | `#3F6B4F` | Confirmation, in-budget, owned. |
| `--warning` | `#8E5E20` | **Reserved for rental urgency (≤14 days). Nothing else.** 5.6:1 on `--surface` — §45 names this pair explicitly, and the original `#A9762F` failed it at 3.95:1. |
| `--warning-soft` | `#FBF1E0` | Urgency fill. |
| `--danger` | `#8C3A32` | Destructive confirm, validation errors, forfeiture. |
| `--danger-soft` | `#F8EAE8` | Error field fill. |
| `--focus` | `#8B5E3C` | Focus ring, 2px offset 2px. Never removed. |

**One accent only.** Warning amber is the rental-urgency signal. Spending it on
anything else (a badge, a promo, a "new" tag) makes the urgency signal stop
meaning anything, and the ≤14-day state is the product's core retention moment.

**Never rely on colour alone** (§45). Urgency = amber **and** copy change **and**
progress-bar state. Availability badges carry words, not dots.

### Dark mode

Not in the MVP. The warm-gallery ground *is* the brand, and a dark inversion
would compete with the artwork rather than recede behind it. `color-scheme: light`
is declared so browser UI does not force-invert form controls.

---

## 3. Type

| Role | Family | Notes |
|---|---|---|
| Display / headings | **Newsreader** | Low-contrast literary serif with a real `opsz` axis — the hero and a caption are different cuts, not one shape scaled. Weight 500 on headings; it sets lighter than most serifs. |
| Body / UI | **Hanken Grotesk** | Humanist, not neo-grotesque: open apertures, a friendlier `a` and `g`. 16px minimum, `line-height: 1.6` for prose. |
| Numerals | **Spline Sans Mono** | Prices, countdowns, dimensions, earnings tables. Narrow, even colour. |

**These were chosen partly for what they are not.** Inter, Playfair, Fraunces,
Poppins and JetBrains Mono are the default vocabulary of generated interfaces —
a page built from them announces its origin before you read a word. All three
faces here are uncommon in that context and each earns its place: Newsreader for
optical sizing, Hanken Grotesk for warmth where Inter is neutral, Spline Sans
Mono for figures that hold a column. Do not substitute a "safe" alternative.

Money and countdowns are **always** monospace or tabular-figure. Columns of
money must align on the decimal, and a countdown must not jitter as digits change.
`font-variant-numeric: tabular-nums` is applied globally to `.tnum` and `Money`.

### Scale

`12 · 14 · 16 · 20 · 24 · 32 · 48 · 64`

Nothing between. Body is 16. Captions 14. Legal/attribution 12. No 15px, no 17px.

| Token | px | Tracking | Use |
|---|---|---|---|
| `--fs-xs` | 12 | +0.04em | Attribution, footnotes, eyebrow caps |
| `--fs-sm` | 14 | +0.01em | Captions, metadata, chips |
| `--fs-base` | 16 | 0 | Body, UI |
| `--fs-lg` | 20 | −0.005em | Lead paragraphs, card titles on detail |
| `--fs-xl` | 24 | −0.01em | Section headings |
| `--fs-2xl` | 32 | −0.02em | Page titles |
| `--fs-3xl` | 48 | −0.025em | Hero (tablet) |
| `--fs-4xl` | 64 | −0.03em | Hero (desktop) |

**Eyebrow labels** (`WORK`, `RENT`, `OWN IT`, `PAST ART`) are the product's
editorial signature: 12px, `letter-spacing: 0.12em`, uppercase, `--text-muted`.
Used for every section label in the PRD's ASCII mockups.

---

## 4. Space

4px base: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`

No arbitrary values. If a layout needs 18px, the layout is wrong.

- Page gutter: 24px mobile, 32px tablet, 48px desktop.
- Max content width: **1280px**. Prose blocks cap at **68ch**.
- Grid gap: 24px desktop, 16px mobile.
- Section rhythm: 96px desktop, 64px mobile, between homepage sections.
- Detail-page artwork mat: **24px internal padding inside a 1px `--border` frame.**

---

## 5. Radius & elevation

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 4px | Inputs, small buttons, badges |
| `--radius-md` | 8px | Cards, panels, modals |
| `--radius-lg` | 12px | **Maximum.** Hero panels only. |
| `--radius-pill` | 999px | **Tag chips only.** Nothing else. |

**Elevation is borders, not shadows.** One shadow token exists (`--shadow-pop`)
for modals and the mobile filter sheet, because a floating layer genuinely needs
to read as floating. Cards use `--border` and a `--surface` fill. A gallery does
not drop-shadow its frames.

---

## 6. Artwork presentation — the load-bearing rules

1. **Native aspect ratio, always.** `object-fit: contain` inside a fixed-width
   cell, or intrinsic sizing. Never `object-fit: cover` on artwork. (Artist
   avatars and hero photography may cover; artwork may not.)
2. **Uniform media cell; artwork contained within it.** Every grid cell is the
   same width *and* the same height (280px desktop / 260px tablet / 200px
   mobile), and the artwork sits inside it at its true aspect ratio with 14px of
   padding. Nothing is ever cropped; a tall or narrow piece simply leaves more
   ground visible, which reads as matting. §35.4 offers "consistent width" or
   "consistent height" — we hold both, because letting cells take native heights
   produced a ragged grid that reads as broken rather than as masonry. This is
   fixed product-wide; never switch a single grid to native heights.
3. Artwork sits on `--surface-sunk` so light-edged pieces still have an edge.
4. Detail page: 1px `--border` frame with 24px padding — a mat, not a skeuomorphic
   frame. No bevels, no drop shadow, no wood texture.
5. Never place text over artwork. Badges sit **below** or **beside**, never on top.
6. Image failure → `--surface-sunk` block with title + artist in text. Never a
   broken-image glyph, never a collapsed layout (§41.5).

---

## 7. Motion

Restrained. The product has exactly **one** showpiece animation: the Mystery
reveal (§26.3). Everything else is functional.

| Token | Value | Use |
|---|---|---|
| `--ease` | `cubic-bezier(0.2, 0, 0, 1)` | Default. Decisive in, soft out. |
| `--dur-fast` | 120ms | Hover, focus, chip toggle |
| `--dur` | 200ms | Panels, dropdowns, toasts |
| `--dur-slow` | 420ms | Modal, sheet, reveal card entry |

- Hover on artwork cards: `--border` → `--border-strong`, image scales **1.015**
  max. No lift, no shadow bloom, no rotation.
- The reveal is a **deliberate** animation, ~600ms between pieces (§26.3). It is
  not a loading state and must never be replaced by a skeleton.
- **`prefers-reduced-motion: reduce` collapses every duration to 1ms** and the
  reveal falls back to instant, non-animated display (§45).

---

## 8. Money presentation (§6.7 — overrides minimalism)

This is the rule that outranks visual taste. Where clean layout and unambiguous
pricing conflict, pricing wins.

- Rendered by the `<Money>` component only. Never a raw template string.
- **A rental figure never appears without its term.** `$200` is meaningless;
  `$200 · 3 months` is the minimum unit.
- A `/mo` figure is always a *derived monthly equivalent* and must be reachable
  to its prepaid total (tooltip on cards, adjacent column everywhere else).
- Cards show a rental figure **and** the purchase price. Both. Always.
- Whole dollars only. Cents are stored, never displayed.
- Prices read from stored columns. **Never recomputed at render time.**

---

## 9. Component conventions

- **Buttons**: 3 variants — `primary` (accent fill, white ink), `secondary`
  (surface fill, border), `ghost` (text + underline on hover). Height 44px
  default / 36px compact. Never more than one `primary` visible in a viewport
  region.
- **Chips**: pill radius, 14px, `--accent-soft` when selected with a 1px
  `--accent` border; `--surface` with `--border` when not. Selected state carries
  a check glyph, not just a fill (never colour alone).
- **Badges**: 4px radius, 12px caps, always text. `available` / `In someone's
  home` / `Sold` / `Owned` / `Mystery`.
- **Focus**: `outline: 2px solid var(--focus); outline-offset: 2px`. Applied via
  `:focus-visible`. Never removed without a replacement.
- **Skeletons**: match real layout dimensions exactly so nothing shifts on load.
  `--surface-sunk` with a 1.4s shimmer that respects reduced-motion.
- **Touch targets**: 44×44 minimum on every interactive element at <768px.

---

## 10. Layout & breakpoints

| Breakpoint | Grid | Notes |
|---|---|---|
| ≥1280px | 4 columns | Detail = 2 col, sticky price panel |
| 1024–1279 | 3 columns | Sticky panel retained |
| 768–1023 | 2–3 columns | Price panel becomes inline |
| <768px | 2 columns | Bottom nav; price panel pinned to viewport bottom |

Desktop is the demo surface and gets priority, but **no layout may break on
mobile** and **no page may scroll horizontally at 390px**. Wide content (price
ladders, earnings tables) scrolls inside its own container.

---

## 11. Voice

Editorial and plain. Short sentences. No exclamation marks. No "Oops!". No
"Awesome!". Never anthropomorphise the algorithm beyond what it does.

- Say *"We matched your brief with three pieces."* Not *"Our AI curated…"*.
- Say *"Renting doesn't reduce the purchase price."* Not *"Note: rental payments
  are non-applicable toward purchase."*
- Errors state what happened, what it cost the user (usually nothing), and what
  to do next.
- **Banned copy** (§7.4): "apply your rent", "rent toward ownership",
  "rent-to-own", "you've already paid X toward this".
- Primary CTA is **"Discover My Art"** everywhere. Never "Discover Your Art".
