# Redesign v2: "First light, closer" (2026-11-16, rev 2)

Maxwell reviewed the Phase 6 build and asked for five things. This file is the brief for that pass and
**overrides `01`–`06`, `DESIGN.md` and `PLAN.md` wherever they conflict.**

1. Everything is too spaced out. Make it tighter and closer together.
2. A stronger landing that leads into a bigger scroll effect.
3. More scroll effects.
4. More of the visuals rendered in Blender.
5. More design in general.

Evidence of the starting point: `D:\claude-scratch\gieo\redesign-before\walk\` (one screenshot per 0.75
screen, 1440×900 and 390×844). Shot `w1440-02` is an almost empty screen; the hero is a small flat seed on
blank cream; the page is 12.8 screens long with long blank runs.

**Rev 2** folds in the spec review of the same day. The big change from rev 1: films ship as **scrubbed
video**, not WebP frame sequences (§4), and frame ranges are now exact.

## 1. What changes in the rules, and what does not

| Rule | Was | Now |
|---|---|---|
| Pin length | max 150vh | Hero up to 300svh, other pins up to 250svh, **only if a new text block (a heading or paragraph, not a word reveal) comes fully into view at least every 70svh**. Still no snap, no scroll-jacking, native touch scroll on phones. |
| 3D runtime | one real-time R3F canvas, three scenes | **Blender-rendered films scrubbed by scroll** (§4). The R3F canvas is no longer mounted on the home page. Do not delete the R3F files or dependencies in this pass. |
| Number of animations | exactly three | The three story scenes stay (sow → weave → bloom) and get bigger. Extra scroll effects (§3) are added around them. |
| Tone | "it whispers", lots of cream space | Same palette and fonts, but **bigger type, denser screens, real light and shadow, one dark (plum) section**. Calm, not empty. Still no neon, no bouncy springs. |
| 3D payload | ≤ 2.5 MB whole page | Per-film budgets in §4, lazy by proximity, the hero film starts only after `load`. |
| Spacing tokens | section 96→192 px | §2. |

Unchanged and still hard rules: no invented facts, numbers, people or **brocade patterns** (plain weave or
twill only until GIEO sends a scan); logo never redrawn or retyped (the `h1` "GIEO" is headline copy in
Playfair, not the logo); minors' privacy; VI + EN for every string, in `src/content/*.json`; hero text is the
LCP element; no preloader, popup, cookie bar or "scroll down" pill; every 3D asset comes from a re-runnable
script in `blender/`; layering contract in `DESIGN.md` §1.

Rules added by the review:

- **LCP paints at once.** The `h1` is visible in the first server-rendered frame. Its entrance uses CSS
  transform only: no `opacity: 0` start and no clipping, because Chrome does not count either as painted.
- **Copy is visible by default.** CSS shows all copy; JS adds the hidden-before-reveal state. If JS fails
  the page is fully readable.
- **Reduced motion means no pins.** Copy sits in normal flow with the film's key stills beside it.
- **Pinned copy must fit.** Each beat's copy fits in `100svh − nav` at 375×667 in Vietnamese. Below a
  minimum height (for example `@media (max-height: 600px)`) pins switch off and copy goes into flow.
- **Never `overflow-x: hidden` on an ancestor of a pin**; it silently breaks `position: sticky`. Bleeding
  elements (weave film, kinetic band) clip with `overflow-x: clip` on their own wrapper.
- **Plum scope.** A `[data-tone="plum"]` scope remaps `--fg-heading`, `--fg-body`, `--fg-strong`,
  `--focus-color`, `--line-hair` and link and button colours to cream-based values. Add the pairs to the
  `DESIGN.md` contrast table. Plum-on-plum focus rings and `ink-soft` body text are failures.
- **Partner credit.** Any frame or still that shows products carries the credit line
  (`collections.hmong.credit`), per `01-brand.md`.
- **The thread never crosses text.** Route the path through gutters and gaps, not just under text in z-order.
- The footer's large closing line reuses `journal.heading`; render it as a `<p>` so the heading is not
  duplicated for screen readers.

New copy: reuse existing keys. A new short label is allowed only if it states no fact, is added to both
locales, and is listed as `DRAFT` in `PROGRESS.md` for GIEO to approve.

## 2. Tighter rhythm

| Token | Was (375 → 1920) | Now |
|---|---|---|
| `--space-section` | 96 → 192 | 56 → 112 |
| `--space-section-sm` | 64 → 128 | 40 → 72 |
| `--handoff` | 96 → 200 | 48 → 96 |
| `--beat-min` | 50svh | removed; beats are sized by their content plus the pin they sit in |

- Type scale goes up, not down: hero headline `clamp(6rem, 27vw, 26rem)`, h2 about 1.5× today's, lead
  paragraphs one step larger. Tight means less dead space, not smaller text.
- Wider use of the 12 columns: text blocks sit beside imagery, not above blank halves.

**Density check** (`scripts/qa-density.mjs`, new). Walk the page in 0.75 screen steps at 1440×900 and
390×844, `/en` and `/vi`. Before each shot: wait for fonts, for every near film stage to report
`data-media="ready"`, and for the scrub to settle; add a QA class that hides decoration (thread, stitches,
kinetic band, glows, nav pill). Then:

- coverage = share of 8×8 px cells in which some pixel differs from that section's background colour by
  ΔE > 6. This counts ink and imagery, not DOM boxes;
- empty band = the tallest run of consecutive rows with no such cell.

Pass = on every shot, coverage ≥ 12 % (desktop) / ≥ 10 % (phone) and no empty band over 35 % of the viewport
height. Run it on the old build's screenshots too: the old build must fail somewhere, and every shot position
that failed must now pass. Report page length in screens before and after.

## 3. Page map v2

One story, top to bottom. `film` = a Blender film (§4). Copy keys are from `src/content/*.json`.

| # | Section | Layout and scroll effect |
|---|---|---|
| S0 | **Sow** (Hero + Meaning merged) | Sticky pin, 280svh desktop / 240svh phone. `film: seed` is full-bleed behind the text. On load: "GIEO" fills the width, the seed is large (about a third of the screen) and overlaps the last letters. Scroll: seed falls, soil rises, headline shrinks to a ghost; the dictionary entry (`meaning.word/pos/pron/gloss`) arrives large with `meaning.body`; sprout opens; `meaning.intro` + `ibNote` arrive as the stem grows; the stem thins into the thread that leaves the frame and becomes the page thread. Copy sits in the film's `textSafe` zone or on a cream scrim. The old separate Meaning section is gone. |
| S1 | **Weave** (Craft) | The dark section: `--plum-ink` background, cream text. Sticky pin about 250svh. `film: weave` is large and bleeds off the right edge on desktop; on phones it is a sticky stage in the top 45svh (below the nav pill) and text scrolls beneath it. `craft.quote` reveals word by word with scroll (split on spaces, never on letters; one readable sentence for screen readers). Product names stay synced to the film (`data-active`). |
| S2 | **Hands** (Partner + NextGen merged) | One editorial block, about one screen. Partner name very large in italic Playfair, body beside it; `nextGen.body` as a lead column; one or two Blender still-lifes (§4) with scroll parallax between layers. |
| S3 | **Bloom** (Pillars) | Sticky pin about 220svh. `film: lotus` large. The three pillar cards are a **stacking deck**: each sticks and the next slides over it, in step with its petal. On phones the lotus is a sticky stage in the top 40svh and the deck stacks beneath it, never over it. |
| — | Kinetic band | Between S3 and S4: one line of very large italic type moving sideways with scroll (the three pillar titles). Decorative, `aria-hidden`, static under reduced motion. |
| S4 | Vision / Mission | Two columns with a stitched divider that sews itself as it enters; headings large. About one screen. |
| S5 | Journal | Heading large. Until GIEO sends consented photos, a row of Blender still-lifes with clip-path reveals and parallax. No captions that state facts, except the partner credit where products show. |
| S6 | Involve + footer | Three large index rows; footer ends on a very large `journal.heading` line with seeds falling past it, closing the loop. |

Effects that run the whole page:

- **The thread.** One SVG path down the full page, starting at the hero film's `threadExit` point, drawn by
  scroll (`stroke-dashoffset`), mint at the top shifting to lotus pink. It swings through the gaps between
  sections on desktop and hugs the left gutter on phones.
- **Running stitch.** Hairlines become dashed "stitches" that sew in when they enter view. This replaces
  the plain 1 px rules as the site's ornament. It is a neutral sewing mark, not a pattern claim.
- Line reveals, hover states and the nav behaviour stay as built.

Motion craft: transform and opacity only, scrubbed with damping, nothing bouncy.

## 4. Films: Blender-rendered, scrubbed as video

Contract between the Blender work and the site. Both sides build to this.

**Why video.** 150 decoded 1600×900 frames are about 860 MB of memory, which kills the tab on an iPhone, and
per-frame image decodes stutter on phones. The repo already scrubs all-intra H.264 with one resident frame,
hardware decode and stall handling (`src/lib/fallback-stage.ts` `mountLite`, encoder in
`scripts/render-fallbacks.mjs`). The films use that path. WebP is used only for key frames.

Blender renders PNG masters to `D:\claude-scratch\gieo\film\raw\<scene>\<set>\` (never into `public/`). An
encode script writes:

```
public/film/<scene>/manifest.json
public/film/<scene>/<set id>.mp4                 all-intra H.264 (-g 1), yuv420p, bt709 tags, +faststart, no audio
public/film/<scene>/keys/<set id>-<iiii>.webp    one per manifest key, index 0-based, 4 digits
public/film/stills/<name>.webp, optional <name>-fg.webp   still-lifes; -fg is a foreground layer for parallax
```

```json
{
  "scene": "seed",
  "frames": 150,
  "fps": 30,
  "alpha": false,
  "sets": [
    { "id": "l",  "aspect": "landscape", "w": 1920, "h": 1080, "focus": [0.62, 0.5], "threadExit": [0.6, 0.0], "textSafe": [0.0, 0.0, 0.45, 1.0] },
    { "id": "ls", "aspect": "landscape", "w": 1280, "h": 720,  "focus": [0.62, 0.5], "threadExit": [0.6, 0.0], "textSafe": [0.0, 0.0, 0.45, 1.0] },
    { "id": "p",  "aspect": "portrait",  "w": 900,  "h": 1200, "focus": [0.5, 0.6],  "threadExit": [0.5, 0.0], "textSafe": [0.0, 0.0, 1.0, 0.42] }
  ],
  "keys": [0, 40, 95, 149],
  "beats": { "fall": [0, 40], "sprout": [40, 95], "thread": [95, 149] }
}
```

Reading the manifest:

- **Scene names are `seed`, `weave`, `lotus`**, the `SceneName` values already in the code. (Rev 1 called
  the hero film `hero`; it is `seed`.)
- **All indices are 0-based.** `frames` is the source of truth: frame `i = round(t · (frames − 1))`, at
  video time `i / fps`. A beat `[a, b]` covers `a ≤ i ≤ b`; neighbouring beats share an endpoint.
- `w`, `h` are the displayed frame. With `"alpha": true` the mp4 is `2w × h`: premultiplied RGB on the left,
  alpha on the right, exactly as today's fallback videos. Keep every mp4 at or under 1920×1080.
- `focus`, `threadExit` and `textSafe` (`[x0, y0, x1, y1]`) are normalised to the frame. The site fits a
  film with `cover`, anchored on `focus`. `threadExit` is where the stem leaves the frame; the page thread
  starts there. The film keeps `textSafe` free of busy detail (soil, leaves) so copy stays legible.
- Still frames come from `keys`; the Still tier shows the key nearest the current frame.

| Scene | Frames | Alpha | Sets | Byte ceiling per mp4 | Content |
|---|---|---|---|---|---|
| `seed` | 150 | no: cream ground and light rendered in | `l` 1920×1080, `ls` 1280×720, `p` 900×1200 | 8 MB, 4 MB, 4 MB | Seed hovering → falls into real granular soil → splits, sprout and two leaves open → stem grows and thins to a thread leaving the frame at `threadExit`. Camera pushes in, then follows the stem. Edges of the frame resolve to flat `--cream` so the film meets the page. |
| `weave` | 170 | yes | `s` 960×960 | 5 MB | Close on yarn: warps strung, weft interlacing with shallow depth of field, cloth forms, pulls back, drapes into the tote, then mug, then coaster. Lit to sit on plum. |
| `lotus` | 160 | yes | `s` 960×960 | 4 MB | Bud on a stem → petal 1, 2, 3 → full bloom, translucent petals with light through them. The finale may be simplified. |
| stills | 1 each | yes | long edge 1600 | 150 KB each | Four to six still-lifes: thread spools, folded plain-weave cloth with a needle, the three products together, a lotus seed pod with seeds, a tray of sprouts. |

Exact beat frame ranges. These follow the weights in `src/lib/fallback-timeline.ts`, so the film lands on
the same scroll positions as the copy. Each manifest's `beats` must equal them:

- `seed`: fall 0–40, sprout 40–95, thread 95–149.
- `weave`: thread 0–30, warps 30–50, weave 50–89, drape 89–109, tote 109–129, mug 129–149, coaster 149–169.
- `lotus`: rise 0–20, p1 20–51, p2 51–82, p3 82–113, bloom 113–128, finale 128–159.

Byte ceilings are ceilings, not targets. Set the CRF from a test encode of the busiest frames and report
the real sizes; if a film cannot look good under its ceiling, say so instead of shipping mush.

Look: Cycles (or EEVEE if Cycles cannot meet the time budget). One large soft key from the top left (the
page's peach "sun"), warm bounce, a thin rim; soft contact shadows. Brand colours must survive: use the
`Standard` or `Khronos PBR Neutral` view transform and check rendered swatches against
`src/styles/tokens.css`, after the H.264 encode as well as before. Real material detail: seed ridges and
slight sheen, granular soil, yarn twist and fuzz, petal subsurface scattering, glazed ceramic. Nothing that
reads as anatomical. No invented brocade motif. Check alpha edges for dark fringes on both cream and plum.

Playback (site side): a `FilmStage` built on the existing `mountLite` path, with the video size read from
the manifest instead of the hard-coded `VIDEO_W`.

- Pick the set by the stage box's aspect (portrait box → `p`), then by size: the Lite tier or a box under
  900 CSS px wide takes the smaller landscape set. Tier does not change frame count.
- Tiers: Full and Lite both scrub video. Still (reduced motion, Save-Data, video error or a 6 s stall) shows
  the `keys` frames with fades. Missing WebGL2 no longer forces Still; opaque films need only a 2D canvas.
- The poster is the key frame nearest the current scroll position, drawn into a canvas (never an `<img>`,
  so it cannot become the LCP element).
- A stage starts loading when its section is within 1.5 screens, and frees its video when it is more than
  3 screens away. The hero film waits for `load` and uses low fetch priority.
- If a manifest is missing the stage keeps its gradient, so the site works before the renders land.
- `TRACKS` in `fallback-timeline.ts` takes its frame counts from these numbers; extend
  `scripts/timeline.test.mjs` to assert that `TRACKS` and each manifest's `frames` and `beats` agree.

## 5. Checks for this pass

- Density check (§2) passes on every shot, with before and after numbers in `PROGRESS.md`.
- Walk screenshots at 1440×900 and 390×844 saved to `qa/redesign/`, VI and EN, and looked at.
- No horizontal overflow at 375; Vietnamese text fits; contrast pairs re-run for the plum scope and for
  hero copy measured on the film's busiest frame.
- LCP element is hero text **and** LCP time is under 2.5 s at 4× CPU slowdown.
- Scroll trace, 10 s: no long task over 50 ms, no frame over 33 ms on this PC, and a second run at 4× CPU.
- Reduced motion: no pins, all copy readable in flow. JS disabled: all copy visible.
- Typecheck, lint, `content:check`, `test:motion` and build are clean.
- Each film: manifest matches §4, frame count and beats match, size under the ceiling, a contact sheet
  composited on the right background looked at.

Watch in QA (known risks, not yet checked): softness of the hero film on 2× desktop screens; first scrub
before the video has buffered; alpha fringes on plum; the nav pill over the phone weave stage; total pin
length on phones (710svh); iPhone and mid-range Android behaviour, which this PC cannot test.
