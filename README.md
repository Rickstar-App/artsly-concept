# Curio

**A personalised, continuously refreshable art collection for your home.**

Discover, rent, and rotate original work from emerging artists — scored against
your taste and your wall — with a Mystery Art subscription that curates or
commissions for you.

This is a complete implementation of `art_marketplace_mvp_prd.md` **v2.0**.
Every section reference in the code (`§12.7`, `§24.2`, …) points at that
document. Where a decision departs from the spec, the code says so and gives the
reasoning at the site of the departure — see [Spec deviations](#spec-deviations).

---

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

No database, no API keys, no configuration. The catalogue and all 65 artwork
images are committed; session state lives in a signed cookie.

Sign in from the footer — **Sign in as Alex (demo)** or **Sign in as Maya
(artist demo)**. Both are real sign-ins against real seeded accounts with a real
password (§32.1); there is no auth-bypass path anywhere in the codebase.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `start` | Production build and server |
| `npm test` | 154 unit tests (§46.1) |
| `npm run typecheck` | `tsc --noEmit`, strict |
| `npm run seed` | Regenerate all 65 artworks and `src/data/catalog.json` (~50s) |
| `npm run seed:validate` | Every §37.5 rule and §11.2 coverage floor |
| `npm run demo:reset` | Pre-rehearsal catalogue check (§38.4) |
| `npm run verify` | typecheck + tests + seed validation |

---

## Architecture

```
src/lib/
  taxonomy.ts          §9  — THE single source of every enumerated value
  pricing/
    config.ts          §7, §25 — every constant, in integer cents
    rental.ts          §7.2 — the ladder; §7.3 — artist earnings
    mystery.ts         §25 — rate table, bundles, budget-fit alternatives
  recommend/
    score.ts           §12 — all seven components, similarity, diversity
    feed.ts            §12.9–§12.11 — filters, cold start, relaxation counts
    affinity.ts        §13 — behavioural deltas and threshold crossings
    explain.ts         §39 — reason chips and "Why this piece"
  state/machines.ts    §23 — the two state machines, fully specified
  db/                  row types, catalogue access, session store
  actions/             every mutation, as a server action
```

`taxonomy`, `pricing/*`, `recommend/score`, and `state/machines` are **pure and
dependency-free** (§43.2): no database, no React, no fetch. That is what makes
§12.7's worked examples and §25.4's rate table directly testable, and what keeps
the two places prices are computed from drifting.

### The rules that shape the code

- **One option list.** No component defines its own enum. `taxonomy.test.ts` and
  `taxonomy-sql.test.ts` make drift between TypeScript and Postgres a build
  failure — that is the regression guard against v1.0's defect where survey
  strings and artwork tags silently disagreed and three of twelve styles scored
  a permanent zero.
- **All money is integer cents.** Every price derives from `pricing/config.ts`.
  No component hardcodes a figure.
- **`<Money>` is a component, not a helper** (§43.3). Its type signature makes
  `kind="rental"` require a `term`, so §48's "no screen shows a rental figure
  without its term" is enforced by the compiler rather than by review.
- **`PriceLadder` exists once** and is used by detail, checkout, and extend.

---

## Data layer

The PRD specifies Supabase Postgres (§43.1).
`supabase/migrations/0001_init.sql` implements §31 and §32 **in full**: the
schema, CHECK constraints generated from the §9 taxonomy, the monotonic-ladder
constraints, RLS on every table, and the `claim_artwork` function behind §17.3's
availability re-check.

**The running application does not use it.** Artists and artworks are committed
seed data; the mutable half — preferences, affinity, rentals, purchases,
favourites, subscriptions, events — lives in an HMAC-signed, gzipped, httpOnly
session cookie (`src/lib/db/state.ts`, `store.ts`).

That is a deliberate decision, and the reasoning is in the code:

- §37.2 forbids hot-linking because "an external URL that 404s on demo day is an
  avoidable, fatal failure." A database that is not provisioned on demo day is
  the same failure with more steps.
- §38.4 requires the demo to run twice from a reset. A per-session store makes
  reset instant, and makes two browsers genuinely independent — which is exactly
  what §46.2's two-browser inventory test wants to observe.
- The row shapes here are structurally identical to §31, so moving to Supabase is
  a swap at `src/lib/db/`, not a rewrite.

**What this costs, stated plainly:** state is per-browser, so one person cannot
see another's rental. Every §46.2 flow works; a multi-user marketplace would need
the Postgres path wired up.

---

## Seed data and artwork

17 artists, 100 artworks, **every §11.2 coverage floor enforced in CI**:

```
styles   ≥3 each      colours  ≥4 each      moods   ≥5 each      rooms ≥8 each
sizes    ≥8 each      budget bands ≥6 each  boldness ≥4 per band
```

All 100 images are **procedurally generated** by `scripts/art/` — twelve distinct
algorithms, one per style family, each seeded from its artwork's slug so runs are
reproducible. The palette is driven by each piece's own colour tags, so a piece
tagged `blue` is visibly blue and §12's colour scoring is legible on screen
rather than being a claim.

Why generated rather than licensed, and the required §37.4 disclosure surfaces:
see [`ATTRIBUTION.md`](./ATTRIBUTION.md) and `/attribution`.

---

## Demo script

Run `npm run demo:reset` first, then **Reset demo data** in the footer.

1. **Homepage** — the pricing block: `$200` for three months, `$1,200` to own.
2. **Discover My Art** — the eight-question survey as Alex.
3. **The feed** — reason chips on every card. Change size in the filter bar.
4. **Blue Horizon** — expand **Why this piece**: 100% match, seven for seven.
5. **Rent it** — 3 months, $200, simulated checkout.
6. **My Space** — 92 days, four choices.
7. **Extend** — three more months, and the clock starts from *November*, not today.
8. **Swap** — the forfeiture disclosure, with "extend instead" offered.
9. **Learning** — save three pieces sharing a tag Alex has *not* declared
   (`slow-water`, `ninety-seconds`, `cut-piece-no-4` all carry `monochrome`).
   The toast fires on the third. **Note:** §49's script says "save three blue
   abstract pieces", but Alex already declared *abstract* and *blue* in the
   survey, and §13.4 only promotes a tag that is **not** already declared. The
   three pieces above are the ones that actually trigger it.
10. **Mystery Art** — 3 × Large curated against a $50–$100 band quotes
    **$115/mo, above budget**, with two computed alternatives. Take the Medium
    one: **$75/mo, in budget.**
11. **The reveal** — three pieces, three artists, all honouring the brief.
12. **My Space** — library rentals and mystery pieces, one collection.
13. **The artist side** — **Switch to Maya** in the footer. Every figure on that
    dashboard is derived from real rentals and sales at the §7.3 split.

---

## Testing

```bash
npm test          # 154 tests
```

| File | Covers |
|---|---|
| `taxonomy.test.ts` | Every §9 slug; the five specific v1.0 defects |
| `taxonomy-sql.test.ts` | TypeScript and Postgres enums cannot drift |
| `score.test.ts` | §12.7's two worked examples return exactly 100 and 49 |
| `rental-ladder.test.ts` | $1,200 → 80/200/350/590; monotonicity across $180–$3,600 |
| `mystery-price.test.ts` | All six §25.4 rows; bundles; custom dimensions |
| `affinity.test.ts` | Three saves cross +0.45; clamping; the float-precision regression |
| `state-machine.test.ts` | Every legal §23 transition; every illegal one rejected |
| `mystery-integrity.test.ts` | §24.2 — no revealed piece contradicts the brief |
| `seed.test.ts` | §37.5 validation against the committed catalogue |

---

## Deploying

Vercel, zero configuration:

```bash
npx vercel
```

Optional environment variables (all have working defaults) are documented in
[`.env.example`](./.env.example). Set `SESSION_SECRET` in production — without it
the app logs a loud warning and signs sessions with a public development key.

---

## Spec deviations

Four places where the implementation departs from PRD v2.0. Each is documented at
the point of departure in the code.

**1. Size is a soft constraint, not only a score component** — `recommend/feed.ts`

§48 requires "changing size preference from Large to Small changes at least 6 of
the top 12." Under §12.1's normative weights that is unreachable: size carries
0.10, so a preference change moves any score by at most 0.067, while
style+colour+mood+room carry 0.75. Measured against this seed, raw scoring turns
over 1–3 of 12, never 6. Changing the weights was rejected — §12.1 is normative
and §12.7 must return exactly 100 and 49. The resolution comes from §13.1, which
draws the distinction itself: size and room are "physical facts about the user's
wall, not taste." Pieces more than one bucket from the stated size are excluded,
**counted, and shown with a one-click override** — the same shape as §12.9's
budget cutoff. Turnover is now 11 of 12.

**2. The Mystery brief is a hard constraint** — `actions/mystery.ts`

§26.2 says to rank by §12 score and take the top N. Doing exactly that returned
two **red** pieces for a blue/neutral brief, because style, room, size and
boldness together outweighed a total colour miss — the precise failure §24.2 and
§48's "Mystery integrity" forbid. A candidate must now share at least one colour
**and** one style with the brief, and pieces whose *dominant* colour matches rank
first. When that leaves too few, the subscription delivers fewer pieces at a
prorated price (§41.5) rather than one that breaks the promise.

**3. Maya has 8 works, not 12** — `scripts/seed/artworks.ts`

§37.1 constrains every artist to 5–8 works; §38.2 illustrates Maya's dashboard
with 12 pieces / 7 on loan / 2 sold. The binding requirement is §30.1's — that
every figure *derives* from real data, which is the whole point of §0.1 defect
#17. The dashboard shows the real counts rather than inflating the seed past an
explicit constraint.

**3b. The roster is 17 artists, not §37.6's 10.** The names are real people, so
the roster was sized to the list rather than the spec's table. §37.1's 5–8 works
per artist still holds, which is why the catalogue is 100 pieces rather than 65.
Every practice, biography, location and artwork attached to those names is
invented, and no bio uses a gendered pronoun — a name does not tell you someone's
pronouns.

**4. All imagery is generated** — `ATTRIBUTION.md`

§37.2 proposes generated originals plus ~30 licensed photographs. The keyless
public-domain sources actually available return uncontrolled quality —
19th-century battlefield photography, snapshots of parked cars. Presenting those
as an emerging artist's living-room piece is worse on the aesthetic axis
(§52.4's top risk) *and* the honesty axis (§37.4). Full reasoning in
`ATTRIBUTION.md`.

---

## Known gaps

Deliberate, per §52.3, and stated in the product rather than hidden:

- No moderation queue for artist uploads; the artist dashboard's Add Artwork
  panel is a working **pricing calculator** and says publishing is not wired up.
- No scheduler — Mystery rotation is a user-triggered **Rotate now** (§26.5).
- No return-shipping tracking; `ending` → `returned` is a user action or 7 days.
- No notification delivery behind **Notify me**; the button says so.
- No affinity decay (§13.3). Single currency, single country.
- Artist payouts: the split is defined and displayed; disbursement is not built.
