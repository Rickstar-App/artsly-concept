/**
 * SEED ARTWORKS — PRD §37.1, §11.
 *
 * 65 pieces across 10 artists (5–8 each, §37.1). Every §11.2 tag-coverage floor
 * is asserted by `scripts/validate-seed.ts`, which runs in CI:
 *
 *   every style  on >= 3 works   every colour on >= 4 works
 *   every mood   on >= 5 works   every room   on >= 8 works
 *   >= 4 works in each boldness band 1-3 / 4-7 / 8-10
 *   >= 8 works in each size bucket   >= 6 works in each budget band
 *
 * "Without these floors, plausible survey answers produce an empty or
 *  repetitive feed, and the demo dies on stage." (§11.2)
 *
 * `size_category` and all four rental rungs are DERIVED at build time (§9.5,
 * §7.2) — they are never authored here, so they cannot disagree.
 *
 * Two rows are load-bearing fixtures for §12.7 and must not be edited without
 * updating `score.test.ts`:
 *   "Blue Horizon" — 48x36, $1,200 -> Alex scores it 100
 *   "Ferry Light"  — 24x18, $600   -> Alex scores it 49
 */

export interface SeedArtwork {
  artist: string
  title: string
  year: number
  medium: string
  materials: string
  w: number
  h: number
  /** Dollars. Drives the whole ladder (§7.2). */
  price: number
  boldness: number
  styles: string[]
  colors: string[]
  moods: string[]
  rooms: string[]
  description: string
  note: string
  featured?: boolean
  /**
   * Authored composition mode, passed to the generator (`GenContext.mode`).
   *
   * The descriptions above are specific — "a single band across the lower
   * third", "one horizontal rule stopping four inches short of the edge". A
   * generator left to choose its own composition will eventually contradict the
   * caption sitting beside it on the detail page, and a caption that describes a
   * different painting is worse than no caption at all.
   *
   * colorField 0 registers · 1 one mass · 2 diagonal split · 3 veils
   * minimal    0 rule+disc · 1 disc+rule · 2 bars · 3 fields · 4 arc · 5 stroke · 6 gestural
   * stencil    0 burst · 1 bars · 2 squares · 3 chevrons
   * lightStudy 0 radial · 1 parallel · 2 sweeping arc
   * halftone   0 disc · 1 rings · 2 squares
   * dreamscape 1 forces the freestanding doorway
   */
  mode?: number
}

export const ARTWORKS: SeedArtwork[] = [
  // ------------------------------------------------------------------ Maya Chen (8)
  {
    artist: 'maya-chen', title: 'Blue Horizon', year: 2025,
    medium: 'Acrylic on canvas', materials: 'Acrylic, gesso, linen',
    w: 48, h: 36, price: 1200, boldness: 4, featured: true,
    styles: ['abstract', 'contemporary'], colors: ['blue', 'neutral'], moods: ['calm'],
    rooms: ['living-room', 'bedroom', 'office'],
    mode: 0,
    description: 'A single band of deep blue settles across the lower third, carried on thirty-one washes of thinned acrylic. Up close the surface is almost entirely edge; from across a room it reads as one uninterrupted breath of colour.',
    note: 'I painted this the week my father came out of hospital. I wanted something that lowered the room instead of asking anything of it.',
  },
  {
    artist: 'maya-chen', title: 'Tidal Register', year: 2025,
    medium: 'Acrylic on canvas', materials: 'Acrylic, marble dust, canvas',
    w: 40, h: 30, price: 1400, boldness: 5,
    styles: ['abstract'], colors: ['blue', 'green', 'neutral'], moods: ['calm', 'sophisticated'],
    rooms: ['living-room', 'office'],
    mode: 0,
    description: 'Blue-green washes stack in uneven horizontal registers, each one recording where the previous layer had already dried. Marble dust gives the upper field a chalky tooth that catches side light.',
    note: 'The bands are not planned. They are the tide line of whatever I did the day before.',
  },
  {
    artist: 'maya-chen', title: 'Slow Water', year: 2024,
    medium: 'Acrylic on panel', materials: 'Acrylic on birch panel',
    w: 18, h: 18, price: 420, boldness: 3,
    styles: ['abstract', 'contemporary'], colors: ['blue', 'neutral', 'monochrome'], moods: ['calm'],
    rooms: ['bedroom', 'hallway'],
    mode: 1,
    description: 'A square of pale blue that darkens almost imperceptibly toward one corner. The only incident is a soft-edged form near the centre, more suggestion than shape.',
    note: 'Made to be looked at for a long time, or not at all. Both are fine.',
  },
  {
    artist: 'maya-chen', title: 'Ninety Layers', year: 2025,
    medium: 'Acrylic on canvas', materials: 'Acrylic, pigment, cotton canvas',
    w: 60, h: 44, price: 2600, boldness: 6, featured: true,
    styles: ['abstract'], colors: ['earth', 'neutral', 'orange'], moods: ['sophisticated', 'calm'],
    rooms: ['living-room', 'dining-room'],
    mode: 3,
    description: 'Ochre and raw umber built up over four months until the surface stopped being paint and started being ground. A single dark gesture crosses the field just below centre.',
    note: 'I counted for a while and then stopped. Ninety is a guess.',
  },
  {
    artist: 'maya-chen', title: 'Field Notes, Morning', year: 2024,
    medium: 'Acrylic on paper', materials: 'Acrylic on cotton rag',
    w: 18, h: 14, price: 340, boldness: 3,
    styles: ['abstract'], colors: ['neutral', 'green', 'earth'], moods: ['calm', 'cozy'],
    rooms: ['bedroom', 'office', 'hallway'],
    mode: 1,
    description: 'A small study in warm grey and pale sage, made in a single sitting before the light changed. The paper edge is left visible.',
    note: 'One of about forty of these. They are how I decide what the big ones are going to be.',
  },
  {
    artist: 'maya-chen', title: 'Terracotta Interval', year: 2025,
    medium: 'Oil on canvas', materials: 'Oil, cold wax, linen',
    w: 36, h: 36, price: 1500, boldness: 6,
    styles: ['abstract', 'contemporary'], colors: ['earth', 'orange', 'red'], moods: ['cozy', 'sophisticated'],
    rooms: ['living-room', 'dining-room'],
    mode: 0,
    description: 'Burnt orange and clay, held apart by a band of near-white that does not quite reach either edge. Cold wax gives the whole surface a matte, plastered quality.',
    note: 'The gap in the middle is the piece. Everything else is there to make the gap possible.',
  },
  {
    artist: 'maya-chen', title: 'The Long Wash', year: 2026,
    medium: 'Acrylic on canvas', materials: 'Acrylic on stretched linen',
    w: 72, h: 48, price: 4200, boldness: 5,
    styles: ['abstract'], colors: ['blue', 'neutral', 'monochrome'], moods: ['calm', 'sophisticated'],
    rooms: ['living-room'],
    mode: 2,
    description: 'Six feet of graduated blue, poured in one continuous pass on a levelled floor and left to find its own edges over nine days. The largest single-pour work she has completed.',
    note: 'You get one attempt. I ruined four canvases before this one behaved.',
  },
  {
    artist: 'maya-chen', title: 'Verdigris', year: 2024,
    medium: 'Acrylic on panel', materials: 'Acrylic, copper pigment, panel',
    w: 30, h: 22, price: 820, boldness: 4,
    styles: ['abstract', 'contemporary'], colors: ['green', 'neutral', 'earth'], moods: ['calm', 'inspiring'],
    rooms: ['office', 'hallway'],
    mode: 0,
    description: 'Oxidised greens over a warm grey ground, with copper pigment worked into the upper edge so the colour shifts as you walk past it.',
    note: 'Named for the roof of the building where I had my first studio.',
  },

  // ------------------------------------------------------- Jordan Williams (7)
  {
    artist: 'jordan-williams', title: '3:14 AM, Wabash', year: 2025,
    medium: 'Archival pigment print', materials: 'Archival pigment on cotton rag',
    w: 36, h: 24, price: 1100, boldness: 7, featured: true,
    styles: ['photography'], colors: ['monochrome', 'yellow', 'orange'], moods: ['dramatic', 'energetic'],
    rooms: ['living-room', 'office'],
    mode: 1,
    description: 'Ninety seconds under the elevated tracks. Sodium light drags into long amber ribbons across an otherwise black frame; the girders stay perfectly still.',
    note: 'No correction, no stacking. What the sensor collected in ninety seconds is what you are looking at.',
  },
  {
    artist: 'jordan-williams', title: 'Nightwork', year: 2024,
    medium: 'Archival pigment print', materials: 'Archival pigment on baryta',
    w: 24, h: 18, price: 620, boldness: 6,
    styles: ['photography'], colors: ['monochrome', 'blue', 'neutral'], moods: ['dramatic', 'sophisticated'],
    rooms: ['office', 'hallway'],
    mode: 1,
    description: 'A cold blue cast over near-total darkness, broken by three vertical filaments of light where a service crew worked through the night.',
    note: 'They let me stand there for two hours. Nobody asked what I was doing.',
  },
  {
    artist: 'jordan-williams', title: 'Ninety Seconds', year: 2025,
    medium: 'Archival pigment print', materials: 'Archival pigment on cotton rag',
    w: 48, h: 32, price: 1350, boldness: 8,
    styles: ['photography'], colors: ['monochrome', 'orange', 'yellow'], moods: ['dramatic', 'energetic'],
    rooms: ['living-room'],
    mode: 2,
    description: 'The exposure that gave the series its name. Headlights on a wet road resolve into a single sweeping arc, bright enough to read as a physical object.',
    note: 'I timed it on a kitchen stopwatch. Still do.',
  },
  {
    artist: 'jordan-williams', title: 'Cut Piece No. 4', year: 2025,
    medium: 'Spray paint and stencil on panel', materials: 'Aerosol, hand-cut stencil, plywood',
    w: 30, h: 30, price: 760, boldness: 9,
    styles: ['street', 'contemporary'], colors: ['red', 'monochrome', 'neutral'], moods: ['energetic', 'playful'],
    rooms: ['office', 'living-room'],
    mode: 0,
    description: 'A hand-cut radial stencil laid over two passes of red, with the overspray left in. The plywood grain shows through where the paint went thin.',
    note: 'Cut the stencil with a scalpel over three evenings. Used it once, then it fell apart.',
  },
  {
    artist: 'jordan-williams', title: 'Overspray', year: 2026,
    medium: 'Aerosol on canvas', materials: 'Aerosol, stencil, canvas',
    w: 40, h: 30, price: 1250, boldness: 9,
    styles: ['street'], colors: ['vibrant', 'red', 'orange'], moods: ['energetic', 'dramatic'],
    rooms: ['living-room', 'office'],
    mode: 3,
    description: 'Four stencil layers in fluorescent red and orange, deliberately misregistered. Drips are left where they fell.',
    note: 'The misregistration is the whole point. A clean print of this would be worthless.',
  },
  {
    artist: 'jordan-williams', title: 'Stencil Study (Red)', year: 2024,
    medium: 'Aerosol on paper', materials: 'Aerosol on heavy stock',
    w: 16, h: 16, price: 290, boldness: 8,
    styles: ['street'], colors: ['red', 'monochrome', 'neutral'], moods: ['energetic', 'playful'],
    rooms: ['office', 'hallway', 'bedroom'],
    mode: 2,
    description: 'A small, fast study — one stencil, one colour, three minutes. The speckle at the edges is where the can was held too close.',
    note: 'These are warm-ups. I have hundreds. This one I liked.',
  },
  {
    artist: 'jordan-williams', title: 'Lake Shore, Long', year: 2026,
    medium: 'Archival pigment print', materials: 'Archival pigment on cotton rag',
    w: 60, h: 40, price: 2900, boldness: 7, featured: true,
    styles: ['photography'], colors: ['monochrome', 'blue', 'neutral'], moods: ['dramatic', 'calm'],
    rooms: ['living-room', 'dining-room'],
    mode: 1,
    description: 'A four-minute exposure of Lake Michigan in February. The water has gone completely smooth; only the horizon and a single distant light survive the length of the frame.',
    note: 'It was eleven degrees. The battery died right after this one.',
  },

  // --------------------------------------------------------- Sofia Martinez (7)
  {
    artist: 'sofia-martinez', title: 'Mesa, Six O’Clock', year: 2025,
    medium: 'Oil on linen', materials: 'Oil on stretched linen',
    w: 36, h: 24, price: 1300, boldness: 5, featured: true,
    styles: ['impressionist', 'landscape'], colors: ['orange', 'purple', 'earth'], moods: ['calm', 'inspiring'],
    rooms: ['living-room', 'dining-room'],
    description: 'The west mesa at the exact moment the rock turns from orange to violet, built from several thousand short unblended strokes. The colour mixes in your eye, not on the palette.',
    note: 'Ninety minutes a day, eleven days. On the twelfth it rained and I stopped.',
  },
  {
    artist: 'sofia-martinez', title: 'Chamisa in Flower', year: 2024,
    medium: 'Oil on panel', materials: 'Oil on gessoed panel',
    w: 24, h: 20, price: 680, boldness: 6,
    styles: ['impressionist'], colors: ['yellow', 'green', 'earth'], moods: ['playful', 'cozy'],
    rooms: ['dining-room', 'bedroom'],
    description: 'A field of yellow chamisa in late September, painted so densely that the ground barely shows. Small strokes of sage and dusty green hold the yellow from going flat.',
    note: 'It smells appalling in bloom. The colour makes up for it.',
  },
  {
    artist: 'sofia-martinez', title: 'Arroyo, After Rain', year: 2024,
    medium: 'Oil on linen', materials: 'Oil on linen',
    w: 30, h: 22, price: 780, boldness: 4,
    styles: ['impressionist', 'landscape'], colors: ['green', 'earth', 'neutral'], moods: ['calm', 'cozy'],
    rooms: ['bedroom', 'hallway'],
    description: 'The dry wash behind her studio, briefly running. Wet sand takes on a green cast that lasts about two hours a year.',
    note: 'I have waited for this four times and got it twice.',
  },
  {
    artist: 'sofia-martinez', title: 'The Same Three Mesas', year: 2026,
    medium: 'Oil on linen', materials: 'Oil on stretched linen',
    w: 72, h: 40, price: 3900, boldness: 6,
    styles: ['landscape', 'impressionist'], colors: ['orange', 'purple', 'red'], moods: ['inspiring', 'sophisticated'],
    rooms: ['living-room'],
    description: 'Six feet of high desert at the end of the day, the culmination of eleven years spent on one view. Three ridgelines recede into violet; the foreground stays hot.',
    note: 'People ask when I will paint something else. I do not have an answer they like.',
  },
  {
    artist: 'sofia-martinez', title: 'Piñon Shadow', year: 2023,
    medium: 'Gouache on paper', materials: 'Gouache on cotton rag',
    w: 18, h: 14, price: 330, boldness: 3,
    styles: ['impressionist'], colors: ['green', 'earth', 'neutral'], moods: ['calm', 'cozy'],
    rooms: ['bedroom', 'office', 'hallway'],
    description: 'A quiet study of shadow under a piñon at midday, where the ground goes blue-green in the shade and bone-pale two inches away.',
    note: 'Painted sitting on a rock. There is a bit of the rock in the paint.',
  },
  {
    artist: 'sofia-martinez', title: 'Last Light, Tesuque', year: 2025,
    medium: 'Oil on linen', materials: 'Oil on linen',
    w: 44, h: 32, price: 1650, boldness: 7,
    styles: ['landscape', 'impressionist'], colors: ['orange', 'yellow', 'red'], moods: ['inspiring', 'energetic'],
    rooms: ['living-room', 'dining-room'],
    description: 'The hottest painting in the series — cadmium orange and lemon laid side by side with almost no mixing, so the whole canvas vibrates at the edges.',
    note: 'The last four minutes before the sun goes behind the ridge. You do not get to plan.',
  },
  {
    artist: 'sofia-martinez', title: 'Snow on Sangre de Cristo', year: 2024,
    medium: 'Oil on panel', materials: 'Oil on gessoed panel',
    w: 20, h: 16, price: 520, boldness: 4,
    styles: ['landscape'], colors: ['neutral', 'purple', 'blue'], moods: ['calm', 'sophisticated'],
    rooms: ['bedroom', 'hallway', 'office'],
    description: 'First snow on the range, painted from a parking lot. Warm greys in the foreground give way to a cold violet at the peaks.',
    note: 'Small, because it was too cold to stand there for long.',
  },

  // ----------------------------------------------------------- Ethan Brooks (6)
  {
    artist: 'ethan-brooks', title: 'Rule, Interrupted', year: 2025,
    medium: 'Ink on cotton rag', materials: 'Sumi ink on hand-torn cotton rag',
    w: 30, h: 40, price: 980, boldness: 2, featured: true,
    styles: ['minimalist'], colors: ['neutral', 'monochrome', 'earth'], moods: ['calm', 'sophisticated'],
    rooms: ['office', 'bedroom', 'living-room'],
    mode: 0,
    description: 'One horizontal rule, drawn in a single pass, stopping four inches short of the right edge. Nothing else is on the sheet.',
    note: 'The version where the line reaches the edge took two seconds longer and was much worse.',
  },
  {
    artist: 'ethan-brooks', title: 'Two Decisions', year: 2024,
    medium: 'Ink on cotton rag', materials: 'Sumi ink, cotton rag, deckle edge',
    w: 15, h: 18, price: 380, boldness: 2,
    styles: ['minimalist'], colors: ['monochrome', 'neutral', 'earth'], moods: ['calm', 'sophisticated'],
    rooms: ['office', 'hallway', 'bedroom'],
    mode: 0,
    description: 'A short rule and a single dot, placed off-centre in both directions. The deckle edge is left raw on all four sides.',
    note: 'Two marks. It took most of a week to decide where the second one went.',
  },
  {
    artist: 'ethan-brooks', title: 'Deckle No. 9', year: 2025,
    medium: 'Collage on rag', materials: 'Torn rag, wheat paste, graphite',
    w: 22, h: 30, price: 640, boldness: 3,
    styles: ['mixed-media', 'minimalist'], colors: ['earth', 'neutral', 'monochrome'], moods: ['calm', 'cozy'],
    rooms: ['bedroom', 'hallway'],
    description: 'Three torn rectangles of undyed rag, overlapped and pasted, with a faint graphite line running underneath all three.',
    note: 'The tear is the drawing. I stopped pretending otherwise around 2022.',
  },
  {
    artist: 'ethan-brooks', title: 'Everything Removed', year: 2026,
    medium: 'Acrylic on canvas', materials: 'Acrylic on cotton canvas',
    w: 52, h: 40, price: 2200, boldness: 1,
    styles: ['minimalist'], colors: ['neutral', 'monochrome', 'earth'], moods: ['calm', 'sophisticated'],
    rooms: ['living-room', 'office'],
    mode: 0,
    description: 'A four-foot field of warm off-white with a single hairline division low on the left. The quietest work in his practice, and the largest.',
    note: 'There were nine other elements. I took them all out over about five months.',
  },
  {
    artist: 'ethan-brooks', title: 'Fold, Twice', year: 2023,
    medium: 'Ink on paper', materials: 'Sumi ink on folded rag',
    w: 14, h: 18, price: 260, boldness: 2,
    styles: ['minimalist', 'mixed-media'], colors: ['monochrome'], moods: ['sophisticated', 'calm'],
    rooms: ['office', 'hallway'],
    mode: 2,
    description: 'The sheet was folded twice before it was drawn on, and the ink stopped where the creases were. The folds are the composition.',
    note: 'Bookbinding does this to you. You start seeing the paper as the work.',
  },
  {
    artist: 'ethan-brooks', title: 'Margin', year: 2025,
    medium: 'Acrylic on panel', materials: 'Acrylic on birch panel',
    w: 36, h: 24, price: 1150, boldness: 3,
    styles: ['minimalist'], colors: ['neutral', 'blue', 'monochrome'], moods: ['calm', 'sophisticated'],
    rooms: ['living-room', 'bedroom', 'office'],
    mode: 3,
    description: 'A pale field with a narrow band of cold blue holding the left quarter. Nothing is centred, and nothing is quite where you expect it.',
    note: 'Named after the part of a page nobody looks at, which is where I put everything.',
  },

  // -------------------------------------------------------------- Ava Patel (7)
  {
    artist: 'ava-patel', title: 'Neighbour, Remembered', year: 2025,
    medium: 'Acrylic on panel', materials: 'Acrylic and oil stick on birch',
    w: 30, h: 24, price: 890, boldness: 6,
    styles: ['portrait', 'contemporary'], colors: ['red', 'earth', 'orange'], moods: ['sophisticated', 'dramatic'],
    rooms: ['living-room', 'hallway'],
    description: 'A head built from six overlapping flat planes in oxide red and umber. The features never resolve, but the posture is unmistakable.',
    note: 'He lived across the hall for four years. I painted him from memory a week after he moved out.',
  },
  {
    artist: 'ava-patel', title: 'My Grandmother, Twice', year: 2025,
    medium: 'Oil on panel', materials: 'Oil and oil stick on panel',
    w: 40, h: 30, price: 1450, boldness: 6, featured: true,
    styles: ['portrait'], colors: ['earth', 'purple', 'red'], moods: ['cozy', 'sophisticated'],
    rooms: ['living-room', 'dining-room'],
    description: 'Two overlapping profiles of the same woman, painted a year apart and eventually resolved onto one panel. The violet ground belonged to the second sitting.',
    note: 'The second one is more accurate. The first one is more her.',
  },
  {
    artist: 'ava-patel', title: 'Sitter with No Room', year: 2026,
    medium: 'Acrylic on canvas', materials: 'Acrylic on cotton canvas',
    w: 36, h: 28, price: 1300, boldness: 7,
    styles: ['surreal', 'portrait'], colors: ['purple', 'vibrant', 'red'], moods: ['dramatic', 'inspiring'],
    rooms: ['living-room', 'office'],
    mode: 0,
    description: 'A figure seated in a space that does not close — the horizon runs behind her at two different heights, and her shadow falls toward the light.',
    note: 'The backgrounds started misbehaving about a year ago. I decided to let them.',
  },
  {
    artist: 'ava-patel', title: 'Plane, Face, Plane', year: 2024,
    medium: 'Acrylic on panel', materials: 'Acrylic on birch panel',
    w: 18, h: 14, price: 360, boldness: 5,
    styles: ['portrait', 'contemporary'], colors: ['red', 'neutral', 'monochrome'], moods: ['sophisticated'],
    rooms: ['office', 'hallway', 'bedroom'],
    description: 'A small study: three planes, one of which happens to be a face. Removing the fourth is what made it work.',
    note: 'These studies are how I find out whether a person is going to hold up at size.',
  },
  {
    artist: 'ava-patel', title: 'The Room Behaves', year: 2026,
    medium: 'Acrylic on canvas', materials: 'Acrylic and oil stick on canvas',
    w: 48, h: 36, price: 1900, boldness: 8,
    styles: ['surreal'], colors: ['purple', 'orange', 'red'], moods: ['dramatic', 'playful'],
    rooms: ['living-room', 'dining-room'],
    mode: 1,
    description: 'A domestic interior in violet and burnt orange where a doorway stands unattached in open floor, casting a shadow four times its own length.',
    note: 'Titled optimistically. It does not.',
  },
  {
    artist: 'ava-patel', title: 'Anonymous (Blue)', year: 2024,
    medium: 'Acrylic on panel', materials: 'Acrylic on birch panel',
    w: 18, h: 14, price: 390, boldness: 5,
    styles: ['portrait', 'contemporary'], colors: ['blue', 'neutral', 'monochrome'], moods: ['calm', 'sophisticated'],
    rooms: ['bedroom', 'office'],
    description: 'The quietest portrait in the series. Cool blue planes over a grey ground; the sitter is turned almost entirely away.',
    note: 'She asked not to be recognisable. That turned out to improve it.',
  },
  {
    artist: 'ava-patel', title: 'Six Faces, One Week', year: 2026,
    medium: 'Acrylic on canvas', materials: 'Acrylic and oil stick on canvas',
    w: 66, h: 44, price: 4500, boldness: 7,
    styles: ['portrait', 'contemporary'], colors: ['red', 'vibrant', 'purple'], moods: ['dramatic', 'inspiring'],
    rooms: ['living-room'],
    description: 'Her largest work: six sitters from a single week, painted from memory the following Sunday, overlapping across five and a half feet of canvas.',
    note: 'By the end of the week I could not tell you which features belonged to whom. That is in the painting.',
  },

  // -------------------------------------------------------------- Noah Kim (6)
  {
    artist: 'noah-kim', title: 'Quarter Arc, Cadmium', year: 2025,
    medium: 'Acrylic on birch panel', materials: 'Acrylic on birch, hand-masked',
    w: 30, h: 30, price: 840, boldness: 7,
    styles: ['contemporary'], colors: ['red', 'yellow', 'monochrome'], moods: ['energetic', 'playful'],
    rooms: ['living-room', 'dining-room', 'office'],
    description: 'A cadmium quarter-arc springing from the lower-left corner into a lemon field, with one thin rule dividing the upper third.',
    note: 'Graph paper first, always. If the drawing is wrong the painting cannot save it.',
  },
  {
    artist: 'noah-kim', title: 'Graph Paper No. 22', year: 2024,
    medium: 'Acrylic on birch panel', materials: 'Acrylic on birch panel',
    w: 16, h: 16, price: 400, boldness: 5,
    styles: ['contemporary', 'abstract'], colors: ['blue', 'monochrome', 'neutral'], moods: ['sophisticated', 'calm'],
    rooms: ['office', 'hallway'],
    description: 'Four rectangles and one circle on a five-by-five grid, in slate blue and near-black. The grid is never drawn, only obeyed.',
    note: 'Number 22 of an ongoing set. Most of them do not get painted.',
  },
  {
    artist: 'noah-kim', title: 'Two Circles, One Rule', year: 2025,
    medium: 'Acrylic on birch panel', materials: 'Acrylic on birch panel',
    w: 44, h: 34, price: 1600, boldness: 6, featured: true,
    styles: ['contemporary'], colors: ['blue', 'yellow', 'neutral'], moods: ['sophisticated', 'energetic'],
    rooms: ['living-room', 'office'],
    description: 'Two discs of unequal size, one cropped by the frame, separated by a single vertical rule that is not quite at the golden section.',
    note: 'It is off by about an inch on purpose. On the section it looked smug.',
  },
  {
    artist: 'noah-kim', title: 'Masked by Hand', year: 2024,
    medium: 'Acrylic on panel', materials: 'Acrylic on birch panel',
    w: 18, h: 18, price: 400, boldness: 6,
    styles: ['contemporary', 'abstract'], colors: ['yellow', 'monochrome', 'neutral'], moods: ['playful', 'energetic'],
    rooms: ['office', 'hallway', 'bedroom'],
    description: 'A small yellow field cut by three black bars at unequal spacing. Every edge is masked by hand, and the slight thickness variation is visible up close.',
    note: 'Tape leaves a better line than a steady wrist. I have tested this extensively.',
  },
  {
    artist: 'noah-kim', title: 'Division', year: 2026,
    medium: 'Acrylic on canvas', materials: 'Acrylic on cotton canvas',
    w: 60, h: 48, price: 4000, boldness: 8,
    styles: ['contemporary'], colors: ['monochrome', 'red', 'neutral'], moods: ['dramatic', 'sophisticated'],
    rooms: ['living-room', 'dining-room'],
    description: 'Five feet of black and off-white split by one hard vertical, with a single cadmium arc breaking the seam near the base. His largest and most severe work.',
    note: 'The arc is the only thing I changed after the drawing. It needed one mistake.',
  },
  {
    artist: 'noah-kim', title: 'Blue Field, Two Arcs', year: 2025,
    medium: 'Acrylic on birch panel', materials: 'Acrylic on birch panel',
    w: 36, h: 24, price: 1250, boldness: 4,
    styles: ['contemporary', 'abstract'], colors: ['blue', 'neutral', 'monochrome'], moods: ['calm', 'sophisticated'],
    rooms: ['bedroom', 'living-room', 'office'],
    description: 'A soft slate-blue ground with two pale quarter-arcs at opposite corners. The gentlest painting he has made, and the only one without a rule.',
    note: 'Someone asked for a quiet one. This is what that looks like from me.',
  },

  // -------------------------------------------------------- Layla Thompson (6)
  {
    artist: 'layla-thompson', title: 'Ferry Light', year: 2024,
    medium: 'Archival pigment print', materials: 'Archival pigment on matte cotton',
    w: 24, h: 18, price: 600, boldness: 3,
    styles: ['photography', 'landscape'], colors: ['blue', 'monochrome'], moods: ['calm'],
    rooms: ['bedroom', 'hallway'],
    description: 'A single navigation light on flat water at first light, printed on matte cotton so the blacks stay open and soft.',
    note: 'Taken from a dock at 5:20. The light went out about a minute later.',
  },
  {
    artist: 'layla-thompson', title: 'Ridge, 5:40', year: 2025,
    medium: 'Archival pigment print', materials: 'Archival pigment on matte cotton',
    w: 40, h: 26, price: 1200, boldness: 3, featured: true,
    styles: ['photography', 'landscape'], colors: ['neutral', 'blue', 'monochrome'], moods: ['calm', 'sophisticated'],
    rooms: ['bedroom', 'living-room', 'office'],
    description: 'Four ridgelines fading into morning fog, each one a shade paler than the last. There is no black anywhere in the frame.',
    note: 'The mountains are never as contrasty as a screen makes them look. I print for the mountains.',
  },
  {
    artist: 'layla-thompson', title: 'Fog Bank', year: 2024,
    medium: 'Archival pigment print', materials: 'Archival pigment on matte cotton',
    w: 30, h: 20, price: 760, boldness: 2,
    styles: ['photography'], colors: ['monochrome', 'neutral', 'blue'], moods: ['calm'],
    rooms: ['bedroom', 'hallway', 'office'],
    description: 'Almost nothing: a horizontal band of grey where a valley should be, and one darker mark near the lower edge that turns out to be a tree.',
    note: 'I stood there for forty minutes waiting for it to clear. It did not, which was better.',
  },
  {
    artist: 'layla-thompson', title: 'Twenty Minutes', year: 2025,
    medium: 'Archival pigment print', materials: 'Archival pigment on matte cotton',
    w: 56, h: 36, price: 2400, boldness: 4,
    styles: ['landscape', 'photography'], colors: ['green', 'neutral', 'blue'], moods: ['calm', 'inspiring'],
    rooms: ['living-room', 'dining-room'],
    description: 'The twenty minutes when fog and ridgeline overlap and neither one wins. Printed large enough that the grain in the fog becomes part of the surface.',
    note: 'The whole series is about this window. It happens maybe nine mornings a year.',
  },
  {
    artist: 'layla-thompson', title: 'Cove, No Wind', year: 2023,
    medium: 'Archival pigment print', materials: 'Archival pigment on matte cotton',
    w: 16, h: 12, price: 240, boldness: 2,
    styles: ['photography', 'landscape'], colors: ['blue', 'green', 'neutral'], moods: ['calm', 'cozy'],
    rooms: ['bedroom', 'hallway', 'office'],
    description: 'Still water in a small cove, with the far bank reflected so exactly that the horizon has to be inferred.',
    note: 'Small on purpose. It does not need to be big to do what it does.',
  },
  {
    artist: 'layla-thompson', title: 'Blue Ridge, Matte', year: 2026,
    medium: 'Archival pigment print', materials: 'Archival pigment on matte cotton rag',
    w: 72, h: 44, price: 4800, boldness: 5,
    styles: ['landscape', 'photography'], colors: ['blue', 'green', 'neutral'], moods: ['calm', 'sophisticated'],
    rooms: ['living-room'],
    description: 'Six feet of the Blue Ridge at the moment the blue is literal. Seven receding ranges, printed at a size where each one holds its own detail.',
    note: 'Eleven trips before I got a morning clear enough to justify printing it this large.',
  },

  // ---------------------------------------------------------- Daniel Rivera (6)
  {
    artist: 'daniel-rivera', title: 'Loud On Purpose', year: 2025,
    medium: 'Four-colour screenprint', materials: 'Screenprint on heavy stock',
    w: 30, h: 30, price: 820, boldness: 10, featured: true,
    styles: ['pop'], colors: ['vibrant', 'red', 'yellow'], moods: ['playful', 'energetic'],
    rooms: ['living-room', 'office', 'dining-room'],
    mode: 0,
    description: 'Four flat colours, no gradients, one hand-cut halftone screen. A red disc sits dead centre and refuses to apologise for it.',
    note: 'I cut that halftone screen in 2016 and I will not be replacing it.',
  },
  {
    artist: 'daniel-rivera', title: 'Four Flats', year: 2024,
    medium: 'Four-colour screenprint', materials: 'Screenprint on heavy stock',
    w: 24, h: 18, price: 580, boldness: 8,
    styles: ['pop', 'contemporary'], colors: ['yellow', 'blue', 'vibrant'], moods: ['playful', 'energetic'],
    rooms: ['office', 'dining-room', 'hallway'],
    mode: 2,
    description: 'Lemon and cobalt in four flat bands under a rotated dot screen. Legible from thirty feet, which is the entire specification.',
    note: 'If you have to walk up to it, I did it wrong.',
  },
  {
    artist: 'daniel-rivera', title: 'Halftone Sun', year: 2024,
    medium: 'Three-colour screenprint', materials: 'Screenprint on heavy stock',
    w: 18, h: 18, price: 360, boldness: 9,
    styles: ['pop'], colors: ['orange', 'yellow', 'red'], moods: ['playful', 'energetic'],
    rooms: ['dining-room', 'office', 'hallway'],
    mode: 1,
    description: 'Concentric orange rings under a coarse dot screen, printed slightly out of register so the edges buzz.',
    note: 'The buzz is the register error. I print them one at a time and do not correct it.',
  },
  {
    artist: 'daniel-rivera', title: 'Gig Poster (Never Printed)', year: 2025,
    medium: 'Acrylic and screenprint on panel', materials: 'Screenprint and acrylic on panel',
    w: 36, h: 24, price: 1150, boldness: 10,
    styles: ['pop', 'street'], colors: ['vibrant', 'purple', 'orange'], moods: ['playful', 'energetic'],
    rooms: ['living-room', 'office'],
    mode: 2,
    description: 'A poster design for a show that was cancelled, enlarged onto panel and finished by hand in fluorescent violet and orange.',
    note: 'The band broke up two days before the run. The artwork was the only thing that survived.',
  },
  {
    artist: 'daniel-rivera', title: 'The Door Was Not There', year: 2026,
    medium: 'Acrylic on canvas', materials: 'Acrylic and screenprint on canvas',
    w: 48, h: 36, price: 1700, boldness: 9,
    styles: ['surreal', 'pop'], colors: ['orange', 'purple', 'yellow'], moods: ['playful', 'dramatic'],
    rooms: ['living-room', 'dining-room'],
    mode: 1,
    description: 'A flat orange plain under a violet sky, with a freestanding door and two solids hovering just above the horizon. Everything is outlined; nothing casts the right shadow.',
    note: 'Somebody told me pop art cannot be strange. This is my response.',
  },
  {
    artist: 'daniel-rivera', title: 'Register', year: 2026,
    medium: 'Six-colour screenprint on canvas', materials: 'Screenprint on primed canvas',
    w: 60, h: 40, price: 3900, boldness: 10,
    styles: ['pop', 'contemporary'], colors: ['vibrant', 'red', 'purple'], moods: ['energetic', 'playful'],
    rooms: ['living-room'],
    mode: 2,
    description: 'Five feet of deliberately misregistered colour under two overlapping dot screens. The largest thing he has ever pulled through a screen, in one edition of one.',
    note: 'Took four people to move the screen. Worth it.',
  },

  // ---------------------------------------------------------- Amara Johnson (6)
  {
    artist: 'amara-johnson', title: 'Ledger, 1961', year: 2025,
    medium: 'Collage and walnut ink', materials: 'Found ledger paper, wheat paste, walnut ink',
    w: 30, h: 24, price: 780, boldness: 5, featured: true,
    styles: ['mixed-media'], colors: ['earth', 'orange', 'neutral'], moods: ['cozy', 'sophisticated'],
    rooms: ['living-room', 'hallway', 'dining-room'],
    description: 'Torn pages from a 1961 hardware-store ledger, layered and wheat-pasted, then drawn over in walnut ink until the columns become architecture.',
    note: 'Bought the whole ledger for four dollars. Someone kept those numbers for a living.',
  },
  {
    artist: 'amara-johnson', title: 'Dress Pattern (Sunday)', year: 2024,
    medium: 'Collage on panel', materials: 'Found tissue pattern, wheat paste, ink, panel',
    w: 24, h: 20, price: 660, boldness: 4,
    styles: ['mixed-media', 'traditional'], colors: ['red', 'earth', 'neutral'], moods: ['cozy', 'inspiring'],
    rooms: ['bedroom', 'dining-room'],
    description: 'Tissue dress-pattern pieces laid over oxide red, with the cutting lines and notches left legible under the ink.',
    note: 'My grandmother made a version of this dress. I found the pattern in an estate sale two miles from her house.',
  },
  {
    artist: 'amara-johnson', title: 'Walnut Ink Study', year: 2023,
    medium: 'Walnut ink on paper', materials: 'Walnut ink on found paper',
    w: 18, h: 14, price: 300, boldness: 3,
    styles: ['traditional'], colors: ['earth', 'neutral', 'monochrome'], moods: ['calm', 'cozy'],
    rooms: ['bedroom', 'office', 'hallway'],
    description: 'A branch study in home-made walnut ink, which starts warm brown and goes almost black where it pools.',
    note: 'I make the ink from the tree in my mother’s yard. It gets darker every year.',
  },
  {
    artist: 'amara-johnson', title: 'Quilt Logic', year: 2025,
    medium: 'Collage and ink on canvas', materials: 'Found paper, wheat paste, walnut ink, canvas',
    w: 44, h: 36, price: 1550, boldness: 6,
    styles: ['mixed-media', 'traditional'], colors: ['red', 'green', 'earth'], moods: ['cozy', 'inspiring'],
    rooms: ['living-room', 'dining-room'],
    description: 'A nine-block structure borrowed from quilting, built entirely from torn paper in oxide red and dusty green and drawn back into with ink.',
    note: 'The only formal training that mattered. She never called it composition.',
  },
  {
    artist: 'amara-johnson', title: 'Letters, Bought by the Pound', year: 2026,
    medium: 'Collage and ink on canvas', materials: 'Found correspondence, wheat paste, ink',
    w: 60, h: 42, price: 2800, boldness: 5,
    styles: ['mixed-media'], colors: ['earth', 'neutral', 'monochrome'], moods: ['sophisticated', 'cozy'],
    rooms: ['living-room', 'dining-room'],
    description: 'Five feet of layered correspondence — none of it legible, all of it real — pasted, sanded back, and unified under a wash of walnut ink.',
    note: 'I read every letter before I tore it. That felt like the minimum.',
  },
  {
    artist: 'amara-johnson', title: 'Branch, Walnut', year: 2024,
    medium: 'Walnut ink on paper', materials: 'Walnut ink on cotton rag',
    w: 20, h: 16, price: 520, boldness: 3,
    styles: ['traditional'], colors: ['green', 'earth', 'neutral'], moods: ['calm', 'cozy'],
    rooms: ['bedroom', 'hallway', 'office'],
    description: 'A single branch with seven leaves, drawn wet-into-wet so the ink pools at each junction. A green wash sits underneath.',
    note: 'Seven leaves because the eighth one made it a decoration.',
  },

  // -------------------------------------------------------------- Leo Zhang (6)
  {
    artist: 'leo-zhang', title: 'One Pass', year: 2025,
    medium: 'Sumi ink on Xuan paper', materials: 'Hand-ground sumi ink on Xuan paper',
    w: 36, h: 48, price: 1400, boldness: 4, featured: true,
    styles: ['minimalist', 'abstract'], colors: ['monochrome', 'neutral', 'earth'], moods: ['calm', 'sophisticated'],
    rooms: ['living-room', 'office', 'bedroom'],
    mode: 6,
    description: 'One vertical stroke, four feet long, made standing, in a single unbroken movement. Where the brush ran dry, it was allowed to run dry.',
    note: 'If the stroke is wrong the sheet goes in the bin. This is the fourth sheet.',
  },
  {
    artist: 'leo-zhang', title: 'Kept (No. 3 of 40)', year: 2025,
    medium: 'Sumi ink on Xuan paper', materials: 'Hand-ground sumi ink on Xuan paper',
    w: 14, h: 18, price: 430, boldness: 3,
    styles: ['minimalist'], colors: ['monochrome', 'neutral'], moods: ['calm', 'sophisticated'],
    rooms: ['office', 'bedroom', 'hallway'],
    mode: 6,
    description: 'Two short strokes crossing near the lower third, with a dry-brush tail on the second. Ink density shifts across the sheet where the paper drank unevenly.',
    note: 'I make about forty pieces a year and keep four. This was the third one I kept.',
  },
  {
    artist: 'leo-zhang', title: 'Unlearning', year: 2024,
    medium: 'Sumi ink on Xuan paper', materials: 'Sumi ink on Xuan paper',
    w: 14, h: 18, price: 420, boldness: 3,
    styles: ['minimalist', 'abstract'], colors: ['neutral', 'monochrome', 'earth'], moods: ['calm'],
    rooms: ['bedroom', 'office', 'hallway'],
    mode: 6,
    description: 'A mark that was a character ten years ago and is now only a movement. Small, and deliberately unresolved.',
    note: 'A decade removing the meaning until the gesture was the only thing left.',
  },
  {
    artist: 'leo-zhang', title: 'Loaded Brush', year: 2026,
    medium: 'Sumi ink and acrylic on canvas', materials: 'Sumi ink, acrylic, canvas',
    w: 48, h: 36, price: 2000, boldness: 6,
    styles: ['minimalist', 'abstract'], colors: ['monochrome', 'blue', 'neutral'], moods: ['sophisticated', 'dramatic'],
    rooms: ['living-room', 'office'],
    mode: 6,
    description: 'A fully loaded brush dragged once across four feet of canvas over a cold blue ground, spending its entire charge of ink in the first eighteen inches.',
    note: 'On canvas the ink behaves completely differently. It took two years to stop fighting that.',
  },
  {
    artist: 'leo-zhang', title: 'Standing Work', year: 2026,
    medium: 'Sumi ink on Xuan paper', materials: 'Hand-ground sumi ink on Xuan paper',
    w: 70, h: 48, price: 4200, boldness: 5,
    styles: ['minimalist', 'abstract'], colors: ['neutral', 'monochrome'], moods: ['calm', 'sophisticated'],
    rooms: ['living-room'],
    mode: 6,
    description: 'Nearly six feet of paper with three marks on it, made in one pass over about eleven seconds. The largest sheet he can reach across without stepping.',
    note: 'Eleven seconds. Two months of getting the paper flat enough to try.',
  },
  {
    artist: 'leo-zhang', title: 'Hangzhou, Remembered', year: 2023,
    medium: 'Sumi ink on Xuan paper', materials: 'Sumi ink on Xuan paper',
    w: 16, h: 13, price: 330, boldness: 3,
    styles: ['minimalist'], colors: ['neutral', 'blue', 'monochrome'], moods: ['calm', 'cozy'],
    rooms: ['bedroom', 'hallway', 'dining-room'],
    mode: 6,
    description: 'A soft indigo wash under two ink marks, the only work in his practice that references a place directly.',
    note: 'The colour of the lake in the morning, as well as I can still recall it.',
  },
]
