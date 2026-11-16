# Fuller pass: "The descent" (2026-11-16, evening)

Maxwell looked at redesign v2 (`07-redesign.md`) on localhost and sent this. It is the brief for this pass and
**overrides `01`–`07`, `DESIGN.md` and `PLAN.md` wherever they conflict.**

> I don't like the landing page, the first initial. It just has the words, it does not look good at all.
> I want to fix the connection between the first landing page and then the products page, and then that bar.
> The products move too quickly. I don't like how all the text is spaced out. It looks too minimalistic. I need
> it more full, more holistic. The rest of the pages aren't working. Use Higgsfield to generate more graphics.
> It feels too empty right now. I like the bottom, and I like where the text goes sideways, but the rest is
> meh. Fill up the page more, add more 3D animations, add more scroll effects.

His screenshots: the hero (giant "GIEO", one seed, blank cream) and the seam below it, where the film's soil
is cut by a flat line against the plum section and a fat yarn starts abruptly a little left of the thin
thread above it. That flat soil strip is "that bar".

What he likes, so **do not restyle**: the footer close ("This is GIEO, so far." with falling seeds), the
three large Involve rows, and the kinetic band (large italic type moving sideways). Make more things like
those: big italic Playfair, small 3D objects playing against the type, sideways movement.

Still hard rules: no invented facts, numbers, people or **brocade patterns** (plain weave only); the logo is
never redrawn; no photos or generated images of people; VI + EN for every string in `src/content/*.json`;
the hero `h1` is the LCP element and paints in the first frame (transform-only entrance); copy is visible
without JS; reduced motion means no pins and everything readable in flow; no preloader, popup, cookie bar or
"scroll down" pill; never `overflow-x: hidden` on an ancestor of a pin; the partner credit rides with any
image that shows products; the thread never crosses text.

New copy: reuse existing keys first. A new short label is allowed only if it states no fact, exists in both
locales, and is listed as `DRAFT` in `PROGRESS.md`. Vietnamese must be natural, with full diacritics.

## 1. The idea

One continuous camera move down the page: **mountains at dawn → the seed falls → soil → under the ground
(the plum section) → the root becomes the thread → the weave.** Every seam between sections is part of that
move. No flat lines between a film and the next background.

"Full" means: every screen has type, imagery and one ornament; text sits beside or over imagery, never
above a blank half; body copy is larger, not sparser.

- Body copy on desktop is at least `text-lead` (about 20 px); nothing a reader must read is under 16 px;
  captions and labels at least 14 px. The sub-pages today run 11–13 px: that is the main reason they read
  as broken.
- Density check (`scripts/qa-density.mjs`) thresholds go up: coverage ≥ 20 % desktop / ≥ 16 % phone, no
  empty band over 28 % of the viewport, on every shot of every page (home and the four sub-pages).

## 2. Art supplied for this pass (`public/art/`)

Generated with Higgsfield (illustration, soft 3D clay style, no people, no buildings, no patterns) or
rendered in Blender, then processed to WebP by the orchestrator. Files land during the pass; paths are fixed.
Draw large art into a `<canvas>` or load it lazily below the fold so it can never become the LCP element.
Every image that is decoration gets `alt=""`. None of them states a fact; `PROGRESS.md` lists them as
illustrations for GIEO to approve.

| Path | What | Use |
|---|---|---|
| `art/hero/vista.webp` | Opaque 21:9 panorama, pale misty terraced ridges; top and bottom are flat `--cream` | Behind the seed film in the hero |
| `art/hero/ridge-near.webp` | Alpha, one near ridge, mauve/pink | In front of the vista, optional in front of the headline's feet |
| `art/vision/dusk.webp` | Opaque 21:9, plum valley at dusk, darker left half | Full-bleed band behind Vision / Mission |
| `art/pages/collections.webp`, `about.webp`, `get-involved.webp`, `contact.webp` | Alpha still-lifes, long edge 1600 | Sub-page headers |
| `art/objects/*.webp` | Alpha single objects (petals, seeds, spools, books, lotus) | Scattered against type, parallax |
| `art/loops/{sprout,books,thread}.mp4` + `<name>.webp`, `<name>-end.webp` | Short all-intra clips (12 fps, 61 frames) with first- and last-frame posters; `scripts/encode-loops.mjs` | Scrubbed by scroll through `ScrubClip` |
| `art/bands/ridges.webp` | Opaque pale ridges | Backdrop of the Journal closing |
| `art/vision/dusk-mist.mp4` | 5 s seamless mist loop over the dusk valley | Plays muted over `dusk.webp` (off under reduced motion) |
| `art/products/{tote,mug,coaster}.webp` (+ `-800`) | Blender portraits of the three products, alpha; `node scripts/render-film.mjs --scenes art` | Collections tiles |
| `art/seam/roots.webp` (+ `-1200`) | Blender soil edge with roots, alpha, matched to the seed film's last frame | Rendered, **not placed**: the seam is built in CSS and the film canvas (H1). Kept as an option |

The existing Blender films and stills stay: `public/film/{seed,weave,lotus}`, `public/film/stills/*`,
and the weave key frames (`film/weave/keys/s-0129.webp` tote, `s-0149` mug, `s-0169` coaster) are the
product pictures for now.

## 3. Home

### H0. Hero: the vista
First screen at 1440×900, top to bottom: nav pill; eyebrow; "GIEO" at full width; under it one row with the
italic sub line on the left and two buttons (`home.craft.cta` → `/collections`, `nav.getInvolved` →
`/get-involved`) plus the IB line (`home.meaning.ibNote`) as a small label; at the very bottom a slim
sideways band repeating `meaning.word` · `meaning.gloss` ("gieo · to sow · gieo · to sow"), `aria-hidden`.

Behind all of it: the vista. Pale ridges across the middle of the screen, the headline standing in front
of the far ridges, the seed in front of everything. Recommended build: draw `vista.webp` into the seed
film's 2D canvas first, then draw the video frame with `globalCompositeOperation = 'darken'`; the film's
cream ground then keeps the ridges and the seed, soil and sprout cover them (the art is lighter than all
three). `ridge-near.webp` may sit in a second canvas above the headline so the letters' feet stand behind
the nearest hill. If the darken pass shows the ridges through the soil or greys the sprout, fade the vista
out below the film's soil line instead. Check the result on frames 0, 40, 95 and 149.

Scroll: as the seed falls the ridges rise and thin out (far layer slower than near) as if the camera tilts
down to the ground; by the sprout beat only a faint horizon is left above the soil, and it must not sit
under the beat copy at more than 25 % opacity. The headline keeps its shrink-to-ghost. Beats, text-safe
box and reduced-motion behaviour stay as built.

Phones: same idea, the vista cropped to the portrait set; buttons stack; the band stays.

### H1. The seam: going under the ground
Kill the flat line. In the last beat of the hero the bottom of the pinned screen sinks into the dark: the
soil deepens through earth brown into `--plum-ink`, so when the pin lets go the plum section is already
there. Roots: a few thin lines leave the soil downward and one of them is the page thread; it runs down
through the seam and **into the top of the weave film's yarn**, so thread and yarn read as one line. The
weave film's top edge fades in from the dark (mask), never a cut. No element may end in a horizontal line
at this seam at any width (check 390, 768, 1024, 1440, 1920).

### H2. Weave: the products get time
"The products move too quickly." Today tote, mug and coaster each get about 29svh of scroll. New rule:

- each product is on screen, fully formed and still, for **at least 45svh** of scroll before the next one
  starts; the change between two products takes at most 30svh; the three together span at least 210svh at
  1440×900 and 150svh at 390×844. Remap scroll to film frames piecewise (a hold at each product's last
  frame); do not re-render the film. Update `TRACKS`/tests so the Still tier and the QA hook agree.
- during a hold the stage is not dead: a slow scroll-linked drift (transform only, a few px and under 2°).
- the compact product list becomes three large stanzas in the copy column: the product name in large
  italic Playfair, lit when its product is on the stage, with the partner credit near the stage as today.
- between Weave and Hands add a second sideways band: the three product names, running the opposite way
  to the pillar band, on plum.

### H3. The rest of the home page
- **Hands**: body copy to `text-lead`; the two still-lifes larger; add one more still or a loop from
  `art/loops/` when it lands; the stills' parallax is gentle (they also "move too quickly": at most 6 % of
  their own height across the viewport).
- **Bloom**: the pillar cards read as broken at 11 px. Card titles at `text-h3` or larger, bodies at
  `text-body`/`text-lead`; cards wider; the lotus stage larger.
- **Vision / Mission**: a full-bleed band on `art/vision/dusk.webp` inside the `[data-tone="plum"]` scope,
  the image scaling slowly with scroll (1.08 → 1), headings large, body `text-lead`, the stitched divider
  kept. Text contrast measured on the image (≥ 4.5:1; add a plum scrim under the copy if needed).
- **Journal**: a sideways rail of still-lifes that moves with scroll (the image version of the kinetic
  band), then the existing closing.
- Scatter `art/objects/*` and existing still-lifes against the big type where a screen is thin (parallax,
  never over body text).
- Involve rows and footer: unchanged.

## 4. Sub-pages (Collections, About, Get involved, Contact)

They load and navigate without errors; what is broken is the look: 11–13 px type, half-empty screens, no
imagery, none of the home page's motion. Bring them to the home page's level.

- A shared page header: the title very large in italic Playfair, the intro at `text-lead`, the page's
  still-life from `art/pages/` beside it with parallax, a peach glow, a stitched rule. One screen, full.
- **Collections**: the three products as large tiles (weave key frames on a soft plum or petal ground,
  name in `text-h2`, partner credit), the collection name very large, the two contact buttons, a sideways
  band of the product names.
- **About**: the dictionary entry large; the intro as a lead column; pillars as the home page's stacking
  deck or three wide cards; Vision / Mission as on home; Departments as large rows (like the Involve rows);
  the partner block with the partner name very large in italic.
- **Get involved**: the three ways as large index rows (reuse the home Involve pattern); "What we're
  building" as a two-column list in `text-lead` with stitched rules, beside a still-life.
- **Contact**: the email address very large as the main link; Instagram and Facebook as large rows; the
  form with full-size fields (inputs at least 48 px high, 16 px text), beside a still-life.
- Line reveals, running stitches, parallax and one kinetic band per page, all from the existing runtime
  (`data-reveal`, `data-draw`, `data-parallax`, `KineticBand`). No new pins on sub-pages.
- Verify navigation as a visitor: every nav and footer link from every page, from the top and from
  mid-scroll on the home page, plus Back/Forward. The new page starts at the top, scrolls with the wheel,
  and the nav pill shows the current page. Fix anything that fails.

## 5. Checks for this pass

- Walk screenshots at 1440×900 and 390×844, `/en` and `/vi`, home and each sub-page, saved under
  `qa/fuller/` and looked at; density check passes at the new thresholds.
- The seam at 390, 768, 1024, 1440 and 1920: no horizontal line, thread meets yarn.
- Weave: measured scroll per product meets H2 (print the numbers).
- LCP element is still the hero `h1` text; LCP under 2.5 s at 4× CPU.
- No horizontal overflow at 375; Vietnamese fits; contrast pairs for text on `dusk.webp` and on the vista.
- Reduced motion: no pins, all copy readable. JS disabled: all copy visible.
- `npm run typecheck`, `lint`, `content:check`, `test:motion` and `build` are clean.

## 6. Working rules for this pass

Several workers edit this tree at once.

- Each worker builds into its own folder and port: `$env:GIEO_DIST='.next-a'; npx next build; npx next start -p 3111`
  (b → 3112, c → 3113). **Never build into `.next` and never touch port 3101**: Maxwell is looking at it.
  A `next start` server does not see files added to `public/` after it started: restart it.
- Shared files (`src/lib/motion-runtime.ts`, `src/app/globals.css`, `src/styles/tokens.css`,
  `src/content/*.json`, `src/components/ui/*`): change them with small targeted edits only, never rewrite
  the whole file, and re-read before each edit. If a build breaks in a file you do not own, wait a minute
  and retry; do not fix someone else's half-finished edit.
- Do not commit, push, deploy or install anything global. Do not edit `docs/`, `CLAUDE.md`, `PROGRESS.md`.
- Chrome for Playwright: `chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })`.
- Look at your own screenshots before reporting. Report: what changed, which checks ran with their output,
  what you could not finish, and any new `DRAFT` labels (key, EN, VI).
