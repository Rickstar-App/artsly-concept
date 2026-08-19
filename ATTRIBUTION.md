# Attribution & Image Provenance

This is a **demonstration build**. The practices, biographies, locations and
artworks attached to every artist in this product are **invented**, and **every
artwork image is procedurally generated** by the committed generator at
`scripts/art/` — seeded from each piece's own slug, so runs are reproducible.
No work shown was made by the person it is attributed to.

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

- **Site footer, always visible** — "Demo build. Artist profiles, biographies and
  artworks are invented for this prototype, and all imagery is procedurally
  generated."
- **Artist profiles** carry a "Demo artist" chip where `is_fictional = true`.
- **This file**, listing the generator and seed behind every image.

## Third-party assets

Typefaces are served by Google Fonts under the SIL Open Font License:
Fraunces, Inter, JetBrains Mono. No other third-party imagery is used.

## Per-image provenance

| Artwork | Artist | Generator | Seed |
|---|---|---|---|
| Blue Horizon | Maya Puterman | `colorField` | `blue-horizon` |
| Tidal Register | Maya Puterman | `colorField` | `tidal-register` |
| Slow Water | Maya Puterman | `colorField` | `slow-water` |
| Ninety Layers | Maya Puterman | `colorField` | `ninety-layers` |
| Field Notes, Morning | Maya Puterman | `colorField` | `field-notes-morning` |
| Terracotta Interval | Maya Puterman | `colorField` | `terracotta-interval` |
| The Long Wash | Maya Puterman | `colorField` | `the-long-wash` |
| Verdigris | Maya Puterman | `colorField` | `verdigris` |
| 3:14 AM, Wabash | Tobias Williams | `lightStudy` | `3-14-am-wabash` |
| Nightwork | Tobias Williams | `lightStudy` | `nightwork` |
| Ninety Seconds | Tobias Williams | `lightStudy` | `ninety-seconds` |
| Cut Piece No. 4 | Tobias Williams | `stencil` | `cut-piece-no-4` |
| Overspray | Tobias Williams | `stencil` | `overspray` |
| Stencil Study (Red) | Tobias Williams | `stencil` | `stencil-study-red` |
| Lake Shore, Long | Tobias Williams | `lightStudy` | `lake-shore-long` |
| Mesa, Six O’Clock | Ella Lodewyk | `pointillist` | `mesa-six-oclock` |
| Chamisa in Flower | Ella Lodewyk | `pointillist` | `chamisa-in-flower` |
| Arroyo, After Rain | Ella Lodewyk | `pointillist` | `arroyo-after-rain` |
| The Same Three Mesas | Ella Lodewyk | `strata` | `the-same-three-mesas` |
| Piñon Shadow | Ella Lodewyk | `pointillist` | `pi-on-shadow` |
| Last Light, Tesuque | Ella Lodewyk | `strata` | `last-light-tesuque` |
| Snow on Sangre de Cristo | Ella Lodewyk | `strata` | `snow-on-sangre-de-cristo` |
| Rule, Interrupted | Finn Kelly | `minimal` | `rule-interrupted` |
| Two Decisions | Finn Kelly | `minimal` | `two-decisions` |
| Deckle No. 9 | Finn Kelly | `collage` | `deckle-no-9` |
| Everything Removed | Finn Kelly | `minimal` | `everything-removed` |
| Fold, Twice | Finn Kelly | `minimal` | `fold-twice` |
| Margin | Finn Kelly | `minimal` | `margin` |
| Neighbour, Remembered | Grace Minakowski | `figure` | `neighbour-remembered` |
| My Grandmother, Twice | Grace Minakowski | `figure` | `my-grandmother-twice` |
| Sitter with No Room | Grace Minakowski | `dreamscape` | `sitter-with-no-room` |
| Plane, Face, Plane | Grace Minakowski | `figure` | `plane-face-plane` |
| The Room Behaves | Grace Minakowski | `dreamscape` | `the-room-behaves` |
| Anonymous (Blue) | Grace Minakowski | `figure` | `anonymous-blue` |
| Six Faces, One Week | Grace Minakowski | `figure` | `six-faces-one-week` |
| Quarter Arc, Cadmium | Aayush Shivashankar | `hardEdge` | `quarter-arc-cadmium` |
| Graph Paper No. 22 | Aayush Shivashankar | `hardEdge` | `graph-paper-no-22` |
| Two Circles, One Rule | Aayush Shivashankar | `hardEdge` | `two-circles-one-rule` |
| Masked by Hand | Aayush Shivashankar | `hardEdge` | `masked-by-hand` |
| Division | Aayush Shivashankar | `hardEdge` | `division` |
| Blue Field, Two Arcs | Aayush Shivashankar | `hardEdge` | `blue-field-two-arcs` |
| Ferry Light | Reilly Snyder | `lightStudy` | `ferry-light` |
| Ridge, 5:40 | Reilly Snyder | `lightStudy` | `ridge-5-40` |
| Fog Bank | Reilly Snyder | `lightStudy` | `fog-bank` |
| Twenty Minutes | Reilly Snyder | `strata` | `twenty-minutes` |
| Cove, No Wind | Reilly Snyder | `lightStudy` | `cove-no-wind` |
| Blue Ridge, Matte | Reilly Snyder | `strata` | `blue-ridge-matte` |
| Loud On Purpose | Dev Dwivedy | `halftone` | `loud-on-purpose` |
| Four Flats | Dev Dwivedy | `halftone` | `four-flats` |
| Halftone Sun | Dev Dwivedy | `halftone` | `halftone-sun` |
| Gig Poster (Never Printed) | Dev Dwivedy | `halftone` | `gig-poster-never-printed` |
| The Door Was Not There | Dev Dwivedy | `dreamscape` | `the-door-was-not-there` |
| Register | Dev Dwivedy | `halftone` | `register` |
| Ledger, 1961 | Angad Miglani | `collage` | `ledger-1961` |
| Dress Pattern (Sunday) | Angad Miglani | `collage` | `dress-pattern-sunday` |
| Walnut Ink Study | Angad Miglani | `ink` | `walnut-ink-study` |
| Quilt Logic | Angad Miglani | `collage` | `quilt-logic` |
| Letters, Bought by the Pound | Angad Miglani | `collage` | `letters-bought-by-the-pound` |
| Branch, Walnut | Angad Miglani | `ink` | `branch-walnut` |
| One Pass | Leo Yang | `minimal` | `one-pass` |
| Kept (No. 3 of 40) | Leo Yang | `minimal` | `kept-no-3-of-40` |
| Unlearning | Leo Yang | `minimal` | `unlearning` |
| Loaded Brush | Leo Yang | `minimal` | `loaded-brush` |
| Standing Work | Leo Yang | `minimal` | `standing-work` |
| Hangzhou, Remembered | Leo Yang | `minimal` | `hangzhou-remembered` |
| The Floor Meets Two Horizons | Jake Janavicius | `dreamscape` | `the-floor-meets-two-horizons` |
| Chair, Waiting | Jake Janavicius | `dreamscape` | `chair-waiting` |
| Second Staircase | Jake Janavicius | `dreamscape` | `second-staircase` |
| Doorway, No Wall | Jake Janavicius | `dreamscape` | `doorway-no-wall` |
| Interior With Weather | Jake Janavicius | `dreamscape` | `interior-with-weather` |
| Two Passes, Misregistered | Tinn Belly | `stencil` | `two-passes-misregistered` |
| West Oakland, 4 AM | Tinn Belly | `stencil` | `west-oakland-4-am` |
| Salvage No. 7 | Tinn Belly | `stencil` | `salvage-no-7` |
| Chevron Stack | Tinn Belly | `stencil` | `chevron-stack` |
| Whole Wall | Tinn Belly | `stencil` | `whole-wall` |
| Cutting, Third of May | Julien Helleman | `ink` | `cutting-third-of-may` |
| Riverbank, Low Water | Julien Helleman | `ink` | `riverbank-low-water` |
| Seed Heads | Julien Helleman | `ink` | `seed-heads` |
| Two Ridges, Rain Coming | Julien Helleman | `strata` | `two-ridges-rain-coming` |
| The Whole Bank, September | Julien Helleman | `strata` | `the-whole-bank-september` |
| Two Hours, Marigny | Jack Kroothoep | `figure` | `two-hours-marigny` |
| Sitter, Half Turned | Jack Kroothoep | `figure` | `sitter-half-turned` |
| Bywater, Late Light | Jack Kroothoep | `figure` | `bywater-late-light` |
| Anonymous, Green Room | Jack Kroothoep | `figure` | `anonymous-green-room` |
| Everyone Who Sat In March | Jack Kroothoep | `figure` | `everyone-who-sat-in-march` |
| Koreatown Signage No. 3 | Parker Hayashi | `halftone` | `koreatown-signage-no-3` |
| Offcuts, Stacked | Parker Hayashi | `halftone` | `offcuts-stacked` |
| Slow Work About Fast Things | Parker Hayashi | `halftone` | `slow-work-about-fast-things` |
| Aisle Seven | Parker Hayashi | `halftone` | `aisle-seven` |
| Whole Front Window | Parker Hayashi | `halftone` | `whole-front-window` |
| Eleven Miles, Dusk | Phillips Moore | `lightStudy` | `eleven-miles-dusk` |
| Water Tank, No Wind | Phillips Moore | `lightStudy` | `water-tank-no-wind` |
| Fence Line | Phillips Moore | `lightStudy` | `fence-line` |
| Road, Held | Phillips Moore | `lightStudy` | `road-held` |
| Marfa, The Long Version | Phillips Moore | `lightStudy` | `marfa-the-long-version` |
| Bridger, Four Bands | Parker Wilding | `strata` | `bridger-four-bands` |
| Gallatin, Snow Line | Parker Wilding | `strata` | `gallatin-snow-line` |
| Paradise Valley, Late | Parker Wilding | `strata` | `paradise-valley-late` |
| Ridge, Reduced | Parker Wilding | `colorField` | `ridge-reduced` |
| The Whole Range, One Morning | Parker Wilding | `strata` | `the-whole-range-one-morning` |
