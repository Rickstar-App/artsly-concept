# Attribution & Image Provenance

This is a **demonstration build**. Every artist listed in this product is fictional,
and **every artwork image is procedurally generated** by the committed generator at
`scripts/art/` — seeded from each piece's own slug, so runs are reproducible.

## Why generated rather than licensed

PRD §37.2 proposes two sources: generated originals for abstract/geometric work,
and licensed photography for the rest. This build uses generation for all 65 pieces.
The reasoning:

- §37.2's own argument for generation applies to every piece: zero licensing
  exposure, guaranteed availability, and — critically — **the palette is driven by
  each piece's own colour tags, so tags and images actually agree**. A user who
  filters to `blue` sees blue work, which is what makes §12's scoring legible.
- §37.2's stated reason to license was "where generation can't reach the bar."
  Twelve distinct style-specific algorithms (`scripts/art/generators.ts`) reach it.
- The keyless public-domain sources actually available return uncontrolled quality —
  19th-century battlefield photography, or snapshots of parked cars. Presenting
  those as an emerging artist's living-room piece would be worse on the aesthetic
  axis (§52.4's top risk) *and* on the honesty axis (§37.4).
- §37.2 forbids hot-linking because "an external URL that 404s on demo day is an
  avoidable, fatal failure." Generating removes the external URL entirely.

## Disclosure surfaces (§37.4)

- **Site footer, always visible** — "Demo build. Artists shown are fictional;
  artwork imagery is generated for this prototype."
- **Artist profiles** carry a "Demo artist" chip where `is_fictional = true`.
- **This file**, listing the generator and seed behind every image.

## Third-party assets

Typefaces are served by Google Fonts under the SIL Open Font License:
Fraunces, Inter, JetBrains Mono. No other third-party imagery is used.

## Per-image provenance

| Artwork | Artist | Generator | Seed |
|---|---|---|---|
| Blue Horizon | Maya Chen | `colorField` | `blue-horizon` |
| Tidal Register | Maya Chen | `colorField` | `tidal-register` |
| Slow Water | Maya Chen | `colorField` | `slow-water` |
| Ninety Layers | Maya Chen | `colorField` | `ninety-layers` |
| Field Notes, Morning | Maya Chen | `colorField` | `field-notes-morning` |
| Terracotta Interval | Maya Chen | `colorField` | `terracotta-interval` |
| The Long Wash | Maya Chen | `colorField` | `the-long-wash` |
| Verdigris | Maya Chen | `colorField` | `verdigris` |
| 3:14 AM, Wabash | Jordan Williams | `lightStudy` | `3-14-am-wabash` |
| Nightwork | Jordan Williams | `lightStudy` | `nightwork` |
| Ninety Seconds | Jordan Williams | `lightStudy` | `ninety-seconds` |
| Cut Piece No. 4 | Jordan Williams | `stencil` | `cut-piece-no-4` |
| Overspray | Jordan Williams | `stencil` | `overspray` |
| Stencil Study (Red) | Jordan Williams | `stencil` | `stencil-study-red` |
| Lake Shore, Long | Jordan Williams | `lightStudy` | `lake-shore-long` |
| Mesa, Six O’Clock | Sofia Martinez | `pointillist` | `mesa-six-oclock` |
| Chamisa in Flower | Sofia Martinez | `pointillist` | `chamisa-in-flower` |
| Arroyo, After Rain | Sofia Martinez | `pointillist` | `arroyo-after-rain` |
| The Same Three Mesas | Sofia Martinez | `strata` | `the-same-three-mesas` |
| Piñon Shadow | Sofia Martinez | `pointillist` | `pi-on-shadow` |
| Last Light, Tesuque | Sofia Martinez | `strata` | `last-light-tesuque` |
| Snow on Sangre de Cristo | Sofia Martinez | `strata` | `snow-on-sangre-de-cristo` |
| Rule, Interrupted | Ethan Brooks | `minimal` | `rule-interrupted` |
| Two Decisions | Ethan Brooks | `minimal` | `two-decisions` |
| Deckle No. 9 | Ethan Brooks | `collage` | `deckle-no-9` |
| Everything Removed | Ethan Brooks | `minimal` | `everything-removed` |
| Fold, Twice | Ethan Brooks | `minimal` | `fold-twice` |
| Margin | Ethan Brooks | `minimal` | `margin` |
| Neighbour, Remembered | Ava Patel | `figure` | `neighbour-remembered` |
| My Grandmother, Twice | Ava Patel | `figure` | `my-grandmother-twice` |
| Sitter with No Room | Ava Patel | `dreamscape` | `sitter-with-no-room` |
| Plane, Face, Plane | Ava Patel | `figure` | `plane-face-plane` |
| The Room Behaves | Ava Patel | `dreamscape` | `the-room-behaves` |
| Anonymous (Blue) | Ava Patel | `figure` | `anonymous-blue` |
| Six Faces, One Week | Ava Patel | `figure` | `six-faces-one-week` |
| Quarter Arc, Cadmium | Noah Kim | `hardEdge` | `quarter-arc-cadmium` |
| Graph Paper No. 22 | Noah Kim | `hardEdge` | `graph-paper-no-22` |
| Two Circles, One Rule | Noah Kim | `hardEdge` | `two-circles-one-rule` |
| Masked by Hand | Noah Kim | `hardEdge` | `masked-by-hand` |
| Division | Noah Kim | `hardEdge` | `division` |
| Blue Field, Two Arcs | Noah Kim | `hardEdge` | `blue-field-two-arcs` |
| Ferry Light | Layla Thompson | `lightStudy` | `ferry-light` |
| Ridge, 5:40 | Layla Thompson | `lightStudy` | `ridge-5-40` |
| Fog Bank | Layla Thompson | `lightStudy` | `fog-bank` |
| Twenty Minutes | Layla Thompson | `strata` | `twenty-minutes` |
| Cove, No Wind | Layla Thompson | `lightStudy` | `cove-no-wind` |
| Blue Ridge, Matte | Layla Thompson | `strata` | `blue-ridge-matte` |
| Loud On Purpose | Daniel Rivera | `halftone` | `loud-on-purpose` |
| Four Flats | Daniel Rivera | `halftone` | `four-flats` |
| Halftone Sun | Daniel Rivera | `halftone` | `halftone-sun` |
| Gig Poster (Never Printed) | Daniel Rivera | `halftone` | `gig-poster-never-printed` |
| The Door Was Not There | Daniel Rivera | `dreamscape` | `the-door-was-not-there` |
| Register | Daniel Rivera | `halftone` | `register` |
| Ledger, 1961 | Amara Johnson | `collage` | `ledger-1961` |
| Dress Pattern (Sunday) | Amara Johnson | `collage` | `dress-pattern-sunday` |
| Walnut Ink Study | Amara Johnson | `ink` | `walnut-ink-study` |
| Quilt Logic | Amara Johnson | `collage` | `quilt-logic` |
| Letters, Bought by the Pound | Amara Johnson | `collage` | `letters-bought-by-the-pound` |
| Branch, Walnut | Amara Johnson | `ink` | `branch-walnut` |
| One Pass | Leo Zhang | `minimal` | `one-pass` |
| Kept (No. 3 of 40) | Leo Zhang | `minimal` | `kept-no-3-of-40` |
| Unlearning | Leo Zhang | `minimal` | `unlearning` |
| Loaded Brush | Leo Zhang | `minimal` | `loaded-brush` |
| Standing Work | Leo Zhang | `minimal` | `standing-work` |
| Hangzhou, Remembered | Leo Zhang | `minimal` | `hangzhou-remembered` |
