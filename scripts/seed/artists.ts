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
 * All ten are FICTIONAL (`is_fictional: true`), which drives the §37.4
 * disclosure: a "Demo artist" chip on every profile plus a persistent footer
 * line. That costs one line of markup and removes the only genuinely
 * embarrassing question the demo could face.
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
    slug: 'maya-chen',
    name: 'Maya Chen',
    tagline: 'Colour fields for rooms people actually live in.',
    bio:
      'Maya paints large, quiet abstractions built from thin acrylic washes — twenty or thirty layers, each one almost transparent. She started making them after five years designing hospital interiors, where she learned that a wall can either raise your heart rate or lower it. Her work is an argument for the second option.',
    location: 'Durham, NC',
    mediums: ['Acrylic', 'Oil', 'Mixed media'],
    styles: ['abstract', 'contemporary'],
    commission_available: true,
  },
  {
    slug: 'jordan-williams',
    name: 'Jordan Williams',
    tagline: 'The city after everyone has gone home.',
    bio:
      'Jordan shoots long exposures on the South Side between two and five in the morning, when the streetlights are the only thing moving. He works with a tripod, a stopwatch and no digital correction — what the sensor collects in ninety seconds is what you get. He also keeps a stencil practice, which he insists is the same project by other means.',
    location: 'Chicago, IL',
    mediums: ['Photography', 'Spray paint', 'Screenprint'],
    styles: ['photography', 'street'],
    commission_available: false,
  },
  {
    slug: 'sofia-martinez',
    name: 'Sofia Martinez',
    tagline: 'High desert light, one broken stroke at a time.',
    bio:
      'Sofia paints the ninety minutes before sundown outside Santa Fe, and only that. She builds each canvas from thousands of short unblended strokes, so the colour mixes in your eye rather than on the palette. She has painted the same three mesas for eleven years and says she is not finished with them.',
    location: 'Santa Fe, NM',
    mediums: ['Oil', 'Gouache'],
    styles: ['impressionist', 'landscape'],
    commission_available: false,
  },
  {
    slug: 'ethan-brooks',
    name: 'Ethan Brooks',
    tagline: 'Removing things until only the decision is left.',
    bio:
      'Ethan makes work with one or two marks on it, which takes him considerably longer than that sounds. He trained as a bookbinder, and the discipline shows: hand-torn cotton rag, visible deckle, nothing centred. He describes his practice as editing rather than drawing.',
    location: 'Portland, OR',
    mediums: ['Ink', 'Cotton rag', 'Collage'],
    styles: ['minimalist', 'mixed-media'],
    commission_available: true,
  },
  {
    slug: 'ava-patel',
    name: 'Ava Patel',
    tagline: 'Portraits of people who are not quite there.',
    bio:
      'Ava builds faces out of overlapping flat planes, then removes enough of them that the sitter stays anonymous. The people are real — friends, neighbours, her grandmother — but she paints only what she can remember of them a week later. Recently the rooms behind them have started behaving strangely.',
    location: 'Brooklyn, NY',
    mediums: ['Acrylic', 'Oil stick', 'Panel'],
    styles: ['portrait', 'contemporary', 'surreal'],
    commission_available: true,
  },
  {
    slug: 'noah-kim',
    name: 'Noah Kim',
    tagline: 'Hard edges, honest math.',
    bio:
      'Noah composes on graph paper before he touches paint, and never deviates from the plan. Circles, quarter-arcs, a single rule dividing the field — the vocabulary has not changed since 2019 and he considers that the point. He masks every edge by hand because tape leaves a better line than a steady wrist.',
    location: 'Seattle, WA',
    mediums: ['Acrylic', 'Birch panel'],
    styles: ['contemporary', 'abstract'],
    commission_available: true,
  },
  {
    slug: 'layla-thompson',
    name: 'Layla Thompson',
    tagline: 'Fog, ridgelines, and the twenty minutes they overlap.',
    bio:
      'Layla walks the Blue Ridge before dawn with a medium-format camera and comes back with maybe one usable frame. She prints on matte cotton so the blacks stay soft, because the mountains are never as contrasty as a screen makes them look. She has never photographed a person on purpose.',
    location: 'Asheville, NC',
    mediums: ['Photography', 'Archival pigment print'],
    styles: ['photography', 'landscape'],
    commission_available: false,
  },
  {
    slug: 'daniel-rivera',
    name: 'Daniel Rivera',
    tagline: 'Loud on purpose.',
    bio:
      'Daniel screenprints in four flat colours and no gradients, using a halftone screen he cut himself in 2016 and refuses to replace. He came out of skate-shop graphics and gig posters, and it shows in the register — everything is meant to be legible from across a room. He thinks most contemporary art is too quiet to be honest.',
    location: 'Austin, TX',
    mediums: ['Screenprint', 'Acrylic'],
    styles: ['pop', 'contemporary', 'surreal'],
    commission_available: false,
  },
  {
    slug: 'amara-johnson',
    name: 'Amara Johnson',
    tagline: 'Paper with a history, cut up and put back.',
    bio:
      'Amara works with ledger paper, dress patterns and letters bought by the pound at estate sales in south Atlanta. She tears rather than cuts, layers with wheat paste, then draws over the whole surface in walnut ink. Her grandmother taught her the quilting logic underneath it, which she says is the only formal training that mattered.',
    location: 'Atlanta, GA',
    mediums: ['Collage', 'Walnut ink', 'Found paper'],
    styles: ['mixed-media', 'traditional'],
    commission_available: false,
  },
  {
    slug: 'leo-zhang',
    name: 'Leo Zhang',
    tagline: 'One gesture, loaded brush, no second attempt.',
    bio:
      'Leo grinds his own ink and works standing, finishing each piece in a single pass — if the stroke is wrong, the sheet goes in the bin. He trained in calligraphy in Hangzhou and spent a decade unlearning the characters until only the movement was left. He makes roughly forty pieces a year and keeps four.',
    location: 'San Francisco, CA',
    mediums: ['Sumi ink', 'Xuan paper', 'Acrylic'],
    styles: ['minimalist', 'abstract'],
    commission_available: true,
  },
]

/** §37.6 — five commission-available artists, so §27's top-three list always fills. */
export const COMMISSION_ARTISTS = ARTISTS.filter((a) => a.commission_available)
