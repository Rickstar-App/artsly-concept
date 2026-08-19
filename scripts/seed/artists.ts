/**
 * ARTIST ROSTER — PRD §37.6.
 *
 * "Each needs a real bio of 2–3 sentences with a specific point of view — not
 *  'explores color and form.'" (§37.6)
 *
 * §6.5 — "Artists are people, not inventory." These bios are the difference
 * between a marketplace and a SKU list, and they are visible on every artwork
 * card, every detail page, and the artists index.
 *
 * ── ON NAMES AND PRONOUNS ──────────────────────────────────────────────────
 * The names below are real people. The practices, biographies, locations and
 * artworks attached to them are entirely invented for this prototype — see
 * §37.4 and `ATTRIBUTION.md`, and the disclosure in the site footer.
 *
 * Because the names are real and nobody has stated their pronouns, NO BIO USES
 * A GENDERED PRONOUN. Each is written in the second or third person without
 * one. If you add an artist, hold that line: a name does not tell you someone's
 * pronouns, and guessing from one misgenders a real person.
 *
 * §37.1 caps each artist at 5–8 works, so 17 artists means the catalogue is
 * ~100 pieces rather than 65.
 */

export interface SeedArtist {
  slug: string
  name: string
  tagline: string
  bio: string
  location: string
  mediums: string[]
  styles: string[]
  commission_available: boolean
}

export const ARTISTS: SeedArtist[] = [
  {
    slug: 'maya-puterman',
    name: 'Maya Puterman',
    tagline: 'Colour fields for rooms people actually live in.',
    bio:
      'Large, quiet abstractions built from thin acrylic washes — twenty or thirty layers, each one almost transparent. The work started after five years designing hospital interiors, where the lesson was that a wall can either raise your heart rate or lower it. These paintings are an argument for the second option.',
    location: 'Durham, NC',
    mediums: ['Acrylic', 'Oil', 'Mixed media'],
    styles: ['abstract', 'contemporary'],
    commission_available: true,
  },
  {
    slug: 'tobias-williams',
    name: 'Tobias Williams',
    tagline: 'The city after everyone has gone home.',
    bio:
      'Long exposures shot on the South Side between two and five in the morning, when the streetlights are the only thing moving. A tripod, a stopwatch, and no digital correction — what the sensor collects in ninety seconds is what you get. A parallel stencil practice runs alongside it, which Tobias insists is the same project by other means.',
    location: 'Chicago, IL',
    mediums: ['Photography', 'Spray paint', 'Screenprint'],
    styles: ['photography', 'street'],
    commission_available: false,
  },
  {
    slug: 'ella-lodewyk',
    name: 'Ella Lodewyk',
    tagline: 'High desert light, one broken stroke at a time.',
    bio:
      'The ninety minutes before sundown outside Santa Fe, and only that. Each canvas is built from thousands of short unblended strokes, so the colour mixes in your eye rather than on the palette. Eleven years on the same three mesas, and the series is not finished with them yet.',
    location: 'Santa Fe, NM',
    mediums: ['Oil', 'Gouache'],
    styles: ['impressionist', 'landscape'],
    commission_available: false,
  },
  {
    slug: 'finn-kelly',
    name: 'Finn Kelly',
    tagline: 'Removing things until only the decision is left.',
    bio:
      'Work with one or two marks on it, which takes considerably longer than that sounds. A background in bookbinding shows: hand-torn cotton rag, visible deckle, nothing centred. Finn describes the practice as editing rather than drawing.',
    location: 'Portland, OR',
    mediums: ['Ink', 'Cotton rag', 'Collage'],
    styles: ['minimalist', 'mixed-media'],
    commission_available: true,
  },
  {
    slug: 'grace-minakowski',
    name: 'Grace Minakowski',
    tagline: 'Portraits of people who are not quite there.',
    bio:
      'Faces built from overlapping flat planes, then stripped back until the sitter stays anonymous. The people are real — friends, neighbours, a grandmother — but only what can be remembered a week later gets painted. Recently the rooms behind them have started behaving strangely.',
    location: 'Brooklyn, NY',
    mediums: ['Acrylic', 'Oil stick', 'Panel'],
    styles: ['portrait', 'contemporary', 'surreal'],
    commission_available: true,
  },
  {
    slug: 'aayush-shivashankar',
    name: 'Aayush Shivashankar',
    tagline: 'Hard edges, honest math.',
    bio:
      'Every composition is worked out on graph paper before any paint is mixed, and the plan is never abandoned mid-way. Circles, quarter-arcs, a single rule dividing the field — the vocabulary has not changed since 2019, and Aayush considers that the point. Every edge is masked by hand, because tape leaves a better line than a steady wrist.',
    location: 'Seattle, WA',
    mediums: ['Acrylic', 'Birch panel'],
    styles: ['contemporary', 'abstract'],
    commission_available: true,
  },
  {
    slug: 'reilly-snyder',
    name: 'Reilly Snyder',
    tagline: 'Fog, ridgelines, and the twenty minutes they overlap.',
    bio:
      'A pre-dawn walk into the Blue Ridge with a medium-format camera, usually for one usable frame. Everything prints on matte cotton so the blacks stay soft, because the mountains are never as contrasty as a screen makes them look. Reilly has never photographed a person on purpose.',
    location: 'Asheville, NC',
    mediums: ['Photography', 'Archival pigment print'],
    styles: ['photography', 'landscape'],
    commission_available: false,
  },
  {
    slug: 'dev-dwivedy',
    name: 'Dev Dwivedy',
    tagline: 'Loud on purpose.',
    bio:
      'Four flat colours, no gradients, and a halftone screen hand-cut in 2016 that will not be replaced. The register comes straight out of skate-shop graphics and gig posters — everything is meant to be legible from across a room. Dev thinks most contemporary art is too quiet to be honest.',
    location: 'Austin, TX',
    mediums: ['Screenprint', 'Acrylic'],
    styles: ['pop', 'contemporary', 'surreal'],
    commission_available: false,
  },
  {
    slug: 'angad-miglani',
    name: 'Angad Miglani',
    tagline: 'Paper with a history, cut up and put back.',
    bio:
      'Ledger paper, dress patterns and letters bought by the pound at estate sales in south Atlanta. Everything is torn rather than cut, layered with wheat paste, then drawn over in walnut ink. The quilting logic underneath it came from a grandmother, and Angad says it is the only formal training that mattered.',
    location: 'Atlanta, GA',
    mediums: ['Collage', 'Walnut ink', 'Found paper'],
    styles: ['mixed-media', 'traditional'],
    commission_available: false,
  },
  {
    slug: 'leo-yang',
    name: 'Leo Yang',
    tagline: 'One gesture, loaded brush, no second attempt.',
    bio:
      'Ink ground by hand, work made standing, each piece finished in a single pass — if the stroke is wrong the sheet goes in the bin. Ten years of calligraphy training in Hangzhou, then a decade unlearning the characters until only the movement was left. Roughly forty pieces a year, of which four are kept.',
    location: 'San Francisco, CA',
    mediums: ['Sumi ink', 'Xuan paper', 'Acrylic'],
    styles: ['minimalist', 'abstract'],
    commission_available: true,
  },

  // ── Added so all seventeen names have a practice of their own ────────────
  {
    slug: 'jake-janavicius',
    name: 'Jake Janavicius',
    tagline: 'Rooms that do not close.',
    bio:
      'Interiors where the perspective quietly disagrees with itself — a floor that meets two horizons, a shadow pointing the wrong way. Everything is painted flat and clean, because the strangeness only works if the surface is calm. Jake builds each one from a cardboard maquette photographed under a desk lamp.',
    location: 'Providence, RI',
    mediums: ['Acrylic', 'Gouache', 'Panel'],
    styles: ['surreal', 'abstract'],
    commission_available: false,
  },
  {
    slug: 'tinn-belly',
    name: 'Tinn Belly',
    tagline: 'Cut once, spray twice, keep the mistakes.',
    bio:
      'Hand-cut stencils on plywood and salvaged door panels, printed in two or three passes and never registered properly on purpose. The overspray and the drips stay in — sanding them off would make it a poster. Tinn came up doing walls in West Oakland and still works standing, fast, outdoors when the weather allows.',
    location: 'Oakland, CA',
    mediums: ['Aerosol', 'Stencil', 'Salvaged panel'],
    styles: ['street', 'pop'],
    commission_available: false,
  },
  {
    slug: 'julien-helleman',
    name: 'Julien Helleman',
    tagline: 'Ink, water, and whatever was growing that week.',
    bio:
      'Botanical studies made in one sitting with hand-ground ink and a single brush, from cuttings taken that morning along the Hudson. Nothing is drawn twice and nothing is corrected, so the record of the hour is still in the paper. Julien keeps a dated notebook of every specimen and has never repeated one.',
    location: 'Hudson, NY',
    mediums: ['Sumi ink', 'Watercolour', 'Handmade paper'],
    styles: ['traditional', 'landscape'],
    commission_available: false,
  },
  {
    slug: 'jack-kroothoep',
    name: 'Jack Kroothoep',
    tagline: 'Faces at the moment they stop performing.',
    bio:
      'Portraits painted from life in a single two-hour sitting, in short broken strokes that only resolve at a distance. The rule is that the sitter talks the whole time and never sees the canvas until it is finished. Jack works out of a converted shotgun house in the Bywater with north light and no clock.',
    location: 'New Orleans, LA',
    mediums: ['Oil', 'Linen'],
    styles: ['portrait', 'impressionist'],
    commission_available: true,
  },
  {
    slug: 'parker-hayashi',
    name: 'Parker Hayashi',
    tagline: 'Supermarket colour, museum patience.',
    bio:
      'Flat screenprinted grounds layered with cut vinyl, packaging offcuts and hand-lettered fragments, built up over weeks until the surface has actual depth. The palette is lifted directly from convenience-store signage photographed around Koreatown. Parker calls it slow work about fast things.',
    location: 'Los Angeles, CA',
    mediums: ['Screenprint', 'Vinyl', 'Found packaging'],
    styles: ['pop', 'mixed-media'],
    commission_available: true,
  },
  {
    slug: 'phillips-moore',
    name: 'Phillips Moore',
    tagline: 'One horizon, held for four minutes.',
    bio:
      'Very long exposures of almost nothing — a road, a fence line, a water tank — made at dusk on the high plains until the sky goes smooth. Prints are made small on purpose, so you have to walk up to them. Phillips has shot the same eleven-mile stretch of highway since 2018.',
    location: 'Marfa, TX',
    mediums: ['Photography', 'Platinum print'],
    styles: ['photography', 'minimalist'],
    commission_available: false,
  },
  {
    slug: 'parker-wilding',
    name: 'Parker Wilding',
    tagline: 'Where the mountain stops being a mountain.',
    bio:
      'Ridgelines abstracted until only the weight and the interval are left — usually four or five bands of colour and nothing else. The source is always a specific place and a specific morning, recorded in the title and nowhere else on the canvas. Parker paints in a barn outside Bozeman with the doors open.',
    location: 'Bozeman, MT',
    mediums: ['Oil', 'Cold wax', 'Canvas'],
    styles: ['landscape', 'abstract'],
    commission_available: true,
  },
]

/** §37.6 / §27.1 — commission-available artists, so §27's top-three always fills. */
export const COMMISSION_ARTISTS = ARTISTS.filter((a) => a.commission_available)
