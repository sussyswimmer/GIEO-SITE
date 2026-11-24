# GIEO: Style Reference

Read this before changing any UI. Tokens live in `src/styles/tokens.css`, which is the only file that may contain hex values. Section-by-section layouts are in `PLAN.md`. If anything here conflicts with `CLAUDE.md` or `docs/*.md`, the docs win; tell Maxwell.

**The home page was rebuilt on 2026-11-16 to `docs/07-redesign.md`. §10 at the end of this file describes it and wins over §1, §5 and §6 wherever they describe the home page.** The token tables in §3 and §4 are current. The inner pages still follow §1–§9.

---

## 1. Art direction: "First light"

GIEO means *to sow*. The site is one long sheet of cream paper seen in early morning. A single warm sun (the blurred peach glow from GIEO's 20/10 post) rises in the hero and sets again in the footer. Between those two lights the reader follows one story told by three 3D moments: **a seed is sown, its stem becomes the thread that weaves the brocade, and the brocade's future blooms as the lotus of three pillars.**

How it feels: airy, editorial, unhurried. **It whispers.** Big quiet Playfair headlines in plum ink, small calm Be Vietnam Pro body text, and a lot of cream space. Colour lives in *light* (glows and fills), never in letters. Pink is the sunlight on the page, not the ink.

What makes it GIEO and not a template:
- **Plum, not black.** Headlines are `--plum-ink`, the logo's ink. There is no near-black page and no terracotta accent.
- **Pink is light, not type.** `--lotus-pink` fails contrast as text (2.51:1 on cream), so it appears only as underlines, glows, the load hairline, a quote mark and the 3D petal tips.
- **The ornament is the story.** The seed, thread and lotus motifs appear as the three 3D scenes. In HTML the only ornament is a 1 px blush hairline (the "thread") and the sprout scroll cue. No scattered icons, no badges, no numbered 01/02/03 markers.
- **Vietnamese first.** Every line-height, measure and component is sized for Vietnamese, which runs up to 50% longer in short labels, and for stacked diacritics (measured in §3).
- **Marginalia, not bento.** Layouts are asymmetric placements on a 12-column grid: a main column plus a narrow side note, staggered pairs and index rows. There are no identical card grids.

### The three signature moments and how Phase 1 reserves them

| # | Moment | Section | Phase 1 (static) | Later phase |
|---|---|---|---|---|
| 1 | **Gieo**: seed sown, sprouts, stem becomes a thread | H0 Hero | `SceneStage scene="seed"`: right half at ≥1024, below the text on mobile, painted with `--still-seed` | Phase 4 (built): hero grows to 200svh (motion-safe); only the stage pins, via a sticky wrapper (a pinned Container would cut the seed off on phones and freeze the text), and the canvas draws the seed inside the stage's rect |
| 2 | **Thread → brocade → product** | H2 Craft | Sticky `SceneStage scene="weave"` in cols 7–12 at ≥1024 while three beats (50svh, 50svh, 85svh) scroll in cols 1–5; inline on mobile; painted with `--still-loom` | Phase 5: thread, plain weave and products scrub over about 109svh of sticky travel (beat 3 is 85svh); product names in the HTML get `data-active` |
| 3 | **Lotus of three** | H5 Pillars | Sticky `SceneStage scene="lotus"` in cols 1–6 at ≥1024 while three pillar cards (each ≥50svh) pass in cols 8–12; inline on mobile; painted with `--still-bloom` | Phase 3: petals open in sync with the cards; at the end the bloom flattens to the logo's line lotus (needs GIEO's SVG) and seeds drift into H6 |

A `SceneStage` never contains text, never holds an invented drawing (no CSS seed, no fake brocade, no traced lotus) and always keeps its box so nothing shifts when the 3D arrives. In the Full tier it turns transparent and the canvas reads its rect. In Lite and Still it holds a media box (the scrubbed video's compositor canvas, or the key-frame posters) and its gradient fades out once that media is ready.

### Layering contract (do not break this, or the 3D can never show)

The one WebGL canvas (Phase 2+) is `position: fixed; z-index: var(--z-canvas)` (0) and sits *behind* the copy but *in front of* section backgrounds. That only works if:

1. The page colour is set on `html` only (`background: var(--bg-page)`). **Never** set a background on `body`, `main` or any wrapper. A body background paints above negative z-index layers.
2. Every section paints its tone, handoff gradient and glow on a child `div` with `position:absolute; inset:0; z-index: var(--z-section-bg)` (-1). The `<section>` itself is `position:relative` with **no** z-index, transform, filter, opacity < 1 or `isolation`, because any of those creates a stacking context and traps the layer.
3. Section content sits in a wrapper with `position:relative; z-index: var(--z-content)` (1).
4. Nothing between `body` and the sections (`main`, providers, Lenis wrappers, page transitions) may create a stacking context.
5. The canvas is rendered as a sibling *before* `main` in the locale layout (Phase 2).

---

## 2. Tokens: colour

### Brand colours (01-brand.md §3; estimates, TODO(brand) verify against GIEO's deck)

| Token | Hex | Role |
|---|---|---|
| `--plum-ink` | `#2E2340` | Headlines, logo ink, primary button fill, focus outline, link text |
| `--cream` | `#F7F0EA` | Page background (on `html`), default section tone, text on plum |
| `--paper` | `#F2F1EF` | Alternate section tone, card surfaces on cream |
| `--blush-line` | `#E6B3C2` | 1 px decorative hairlines ("threads") only |
| `--lotus-pink` | `#EE6FA0` | Decoration only: link underline, load hairline, quote mark, glow shadows, 3D petal tips |
| `--petal-soft` | `#F7B9CF` | Hover fills (as tints), glows, selection, 3D petal base |
| `--peach-glow` | `#FBD5B4` | The sun: radial glows |
| `--stem-mint` | `#6FD3A8` | The sprout scroll cue and 3D stem only |
| `--ink` | `#1C1A1E` | Strong text: lead paragraphs, anything on a glow or fill, nav |
| `--ink-soft` | `#6E6A70` | Body and captions on **flat** cream/paper only; field borders |

`--thread-1..n` will be sampled from GIEO's real brocade photos and added here. Never invent "H'mong colours".

### Alpha tints (no new hues)

`--peach-glow-a85 / -a60 / -a35 / -a20`, `--petal-soft-a40 / -a24`, `--lotus-pink-a35 / -a18`, `--plum-ink-a16 / -a08`, `--cream-a86`. They are built with `color-mix()` from the brand tokens. **Do not use Tailwind opacity modifiers** (`bg-petal-soft/40`): browsers without `color-mix` fall back to the solid colour. Use the named tints.

### Roles (what components reach for)

`--bg-page` cream · `--bg-alt` paper · `--fg-heading` plum-ink · `--fg-strong` ink · `--fg-body` ink-soft · `--fg-on-fill` cream · `--line-hair` blush-line · `--line-field` ink-soft · `--focus-color` plum-ink · `--selection-bg` petal-soft.

### Contrast (computed, WCAG 2.x)

The values come from `D:\claude-scratch\gieo\contrast.mjs`, which reads tokens.css. Re-run it after any colour change: `node D:/claude-scratch/gieo/contrast.mjs`. Composites are what the browser actually paints (sRGB alpha over the stated background).

**Allowed text pairings**

| Text | Background | Ratio | Use |
|---|---|---|---|
| plum-ink | cream | 13.01:1 | All headings and links |
| plum-ink | paper | 13.00:1 | Same |
| plum-ink | petal-soft (solid) | 8.94:1 | Selection highlight |
| plum-ink | glow core: peach 85% over cream | 11.00:1 | Hero headline and eyebrow |
| plum-ink | hover fill: petal 40% over cream | 11.22:1 | Button and card hover |
| plum-ink | nav glass, worst case (cream 86% over plum) | 9.99:1 | Nav links |
| ink | cream / paper | 15.30:1 | Lead paragraphs, strong text |
| ink | glow core: peach 85% over cream | 12.94:1 | Text inside any glow |
| ink | petal 40% over peach 60% over cream (worst stacked glow) | 12.28:1 | Footer, H4 |
| ink | nav glass, worst case | 11.75:1 | Nav |
| ink-soft | cream | 4.70:1 | Body ≥ 13 px on **flat** cream |
| ink-soft | paper | 4.70:1 | Body ≥ 13 px on **flat** paper |
| ink-soft | peach-glow ≤ 20% over cream | ≥ 4.50:1 (limit is 22%) | Edge of a glow only |
| cream | plum-ink | 13.01:1 | Primary button, skip link, current-language chip |

**Plum scope** (`[data-tone="plum"]`, the Weave section; `globals.css` remaps the role tokens, so components need no dark variants)

| Role inside the scope | Value | On plum-ink | Use |
|---|---|---|---|
| `--fg-heading`, `--fg-strong`, `--fg-body` | cream | 13.01:1 | All copy, the quote, product names, the credit. There is no softer body colour on plum: `ink-soft` on plum is 2.77:1 |
| `--fill-primary` / `--fg-on-fill` | cream / plum-ink | 13.01:1 | Primary button: cream fill, plum label |
| `--focus-color` | cream | 13.01:1 | Focus ring |
| `--line-hair` | cream 35 % (`--cream-a35`) | 2.89:1 | Stitched hairlines; decorative only |

**Hero copy on the seed film** (`D:\claude-scratch\gieo\hero-contrast.mjs`: every pixel of each set's `textSafe` box, over the four key frames)

| Set | Darkest pixel in the box | Darkest 1 % of the box |
|---|---|---|
| `l`, `ls` (landscape) | ink 13.91:1, plum-ink 11.82:1 | same |
| `p` (portrait) | ink 6.48:1, plum-ink 5.51:1 (the seed itself, where it hangs in the headline) | ink 13.91:1, plum-ink 11.82:1 |

Hero copy is `--ink` or `--plum-ink` only, never `ink-soft`, and has no scrim.

**Non-text UI (needs 3:1)**

| Mark | Background | Ratio | Use |
|---|---|---|---|
| ink-soft 1 px border | cream / paper | 4.70:1 | Form field boundary |
| plum-ink 2 px outline | cream / paper / glow / fills | ≥ 8.10:1 | Focus ring, secondary button border |
| plum-ink 1.5 px underline | nav glass worst | 9.99:1 | Current page in the nav |

**Decorative (never the only cue for anything)**

| Mark | Background | Ratio | Note |
|---|---|---|---|
| lotus-pink underline | cream | 2.51:1 | Underline on body links at rest. The underline is the non-colour cue and is never removed. It turns plum on hover/focus. |
| blush-line hairline | cream / paper | 1.61:1 | Section threads, card edges |
| stem-mint stroke | cream | 1.61:1 | Sprout scroll cue (`aria-hidden`) |
| lotus-pink quote mark | paper | 2.51:1 | `::before` with empty alt text |

**Forbidden pairings**

1. `--lotus-pink` as text on any light surface, at any size: 2.51:1 on cream, 2.06:1 on peach, 1.73:1 on petal. This also fails the 3:1 large-text rule, which **corrects 01-brand.md §3's "24 px+" allowance** (flagged for Maxwell).
2. `--ink-soft` on: petal-soft (3.23), peach-glow (3.86), any glow above 22% alpha (3.98 at the core), the petal 40% hover fill (4.05), the nav glass (3.61), blush-line (2.93), plum-ink (2.77).
3. `--stem-mint`, `--blush-line`, `--petal-soft` or `--peach-glow` as text on any light surface (≤ 1.61:1).
4. `--cream` text on anything except `--plum-ink` or `--ink`.
5. `--plum-ink` on `--ink` and vice versa (1.18:1).
6. `--blush-line` as the boundary of a control (input, button, toggle). It is decorative only.
7. Pink, mint or petal text on plum fills. They technically pass (5.18 / 8.08 / 8.94) but there are no dark surfaces in this brand, so they are not used.
8. Any opacity on text (`opacity`, `text-*/70`), including "inactive" pillar cards. The one exception is disabled controls (exempt under WCAG).

---

## 3. Tokens: typography

| Family | Token | Loaded as | Use |
|---|---|---|---|
| Playfair Display | `--ff-display` → Tailwind `font-serif` | Self-hosted from `public/fonts`, latin + vietnamese only. 400 roman in `src/styles/fonts.css`; 500 and italic added after load by `LateFonts.tsx` | Hero word, h2–h4, pull quote, dictionary headword, footer sign-off |
| Be Vietnam Pro | `--ff-body` → Tailwind `font-sans` | Self-hosted in `fonts.css`, latin + vietnamese, 300/400/500 | Everything else |

Set `font-synthesis: none` globally (no faux bold or italic on Vietnamese). Never gate text visibility on font load. Use `display: swap`; the metric-matched fallback faces in `fonts.css` keep CLS low.

### Scale (fluid from 375 to 1440 px, capped above)

| Token / utility | clamp() | 375 | 768 | 1280 | 1440+ | Font, weight | Line-height EN / VI | Tracking |
|---|---|---|---|---|---|---|---|---|
| `--fs-hero` / `text-hero` | `max(4rem, min(content width / 2.34, (100svh − 18rem) / 0.95))` | 143 | 297 | 498 | 561 (at 900 high) | serif 400 | 0.95 (only the word "GIEO") | -0.02em |
| `--fs-mega` / `text-mega` | `clamp(3.5rem, 0.331rem + 13.5211vw, 12.5rem)` | 56 | 109 | 178 | 200 | serif italic 400 | 1.04 / 1.30 | -0.02em |
| `--fs-h2` / `text-h2` | `clamp(3.5rem, 1.8275rem + 7.1362vw, 8.25rem)` | 56 | 84 | 121 | 132 | serif 400 | 1.06 / 1.26 | -0.02em |
| `--fs-quote` / `text-quote` | `clamp(2rem, 1.1197rem + 3.7559vw, 4.5rem)` | 32 | 47 | 66 | 72 | serif italic 400 | 1.18 / 1.30 | -0.01em |
| `--fs-h3` / `text-h3` | `clamp(1.5rem, 1.2359rem + 1.1268vw, 2.25rem)` | 24 | 28 | 34 | 36 | serif 500 (or italic 400) | 1.15 / 1.30 | -0.01em |
| `--fs-h4` / `text-h4` | `clamp(1.25rem, 1.162rem + 0.3756vw, 1.5rem)` | 20 | 21.5 | 23 | 24 | serif 500 | 1.20 / 1.26 | -0.01em |
| `--fs-lead` / `text-lead` | `clamp(1.125rem, 0.949rem + 0.7512vw, 1.625rem)` | 18 | 21 | 25 | 26 | sans 300, colour `--fg-strong` | 1.55 / 1.60 | 0 |
| `--fs-body` / `text-body` | `clamp(1rem, 0.956rem + 0.1878vw, 1.125rem)` | 16 | 16.7 | 17.7 | 18 | sans 400 | 1.65 / 1.70 | 0 |
| `--fs-ui` / `text-ui` | `clamp(0.875rem, 0.853rem + 0.0939vw, 0.9375rem)` | 14 | 14.4 | 14.8 | 15 | sans 500 | 1.25 | 0.01em |
| `--fs-caption` / `text-caption` | `0.875rem` | 14 | 14 | 14 | 14 | sans 400 | 1.5 | 0.02em |

These are the redesign v2 values (docs/07 §2: the scale went up, 01-brand.md §4's sizes no longer apply to hero, h2, quote and lead). The hero word is sized to span the content width (the word "GIEO" is 2.34 em wide in Playfair) and capped so it leaves room for the eyebrow and the sub line on a short screen. `text-mega` is the partner name, the dictionary headword, the kinetic band and the cap of the footer's closing line. **Floors: no text under 14 px anywhere, no paragraph under 16 px** (`scripts/qa-density.mjs` fails the page otherwise). Two sizes are set outside the scale, both in `home/Weave.tsx` and `home/Sow.tsx` and commented there: the Weave quote is 56 px from 1280 (a five-column measure), and the hero's dictionary entry is capped in `svh` so it fits the film's text box on short screens. Weight 300 is only for `text-lead` (≥ 18 px).

### Why the Vietnamese line-heights (measured, not guessed)

`D:\claude-scratch\gieo\vi-metrics.mjs` read the actual font files (Google Fonts, upm 1000):

| Font | Highest stacked lowercase mark (ấ ầ ẳ) | Stacked capital (Ấ) | Lowest descender | Minimum lh with no collision |
|---|---|---|---|---|
| Playfair roman | 1.066em | 1.159em | -0.188em (g) | **1.254** |
| Playfair italic | 1.094em | 1.153em | -0.195em | **1.289** |
| Be Vietnam Pro | 0.989em | 1.199em | -0.227em (ỵ) | **1.216** |

So in Vietnamese, roman serif headings use 1.26, and every size that is also set in italic (quote, h3) uses 1.30, while body (1.70) and UI (1.25) clear easily. Italic serif is only ever set at `text-quote` or `text-h3`. `:root:lang(vi)` in tokens.css switches the values; `<html lang>` is already set per locale. **`--lh-hero: 0.95` is only safe for the unaccented hero word**: at 0.95, anything taller than 0.89em above the baseline (À reaches 0.94em, Ấ 1.16em) spills out of the line box.

Rules that follow from the measurements:
- Never put `overflow: hidden`, `overflow: clip`, `line-clamp` or `background-clip: text` on an element that wraps text. Stacked marks get cut off. Line reveals in Phase 2 animate opacity and translate with no mask.
- A text element's first line needs ≥ 0.3em of free space above it inside any clipped parent (cards, frames).
- No letter-splitting of text, ever (kit §5). Split by line only.
- `text-wrap: balance` on h1–h4 and quotes, `text-wrap: pretty` on paragraphs, `hyphens: manual`, `overflow-wrap: break-word`.
- Mark English runs inside Vietnamese pages with `lang="en"`. The hero eyebrow "Girls' Initiative for Education and Opportunities" is English in both locales.

### Measure

`--measure` 66ch (body), `--measure-lead` 58ch, `--measure-narrow` 44ch (notes, cards, captions), `--measure-heading` 18ch EN / 22ch VI (h2 max-width in its own font size).

### Known glyph gap

Neither Playfair nor Be Vietnam Pro contains **ɛ (U+025B)**, which appears in `home.meaning.pron` "/zɛw/" (checked by glyph lookup). Set the pronunciation in `--ff-body` at `text-ui` so the one system-fallback glyph is least visible. See Open questions.

---

## 4. Tokens: spacing, shape, elevation, layout

### Spacing (4 px steps; the token number equals Tailwind's numeric utility)

`--space-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-6` 24 · `-8` 32 · `-12` 48 · `-16` 64 · `-24` 96 · `-32` 128 · `-40` 160. Only these steps: `p-6` is `--space-6`, `p-5` and `p-7` are not used.

Fluid rhythm:

| Token / utility | 375 | 768 | 1280 | 1440+ | Use |
|---|---|---|---|---|---|
| `--space-section` / `py-section` | 56 | 77 | 104 | 112 | Section padding-block (inner pages) |
| `--space-section-sm` / `py-section-sm` | 32 | 47 | 66 | 72 | Home sections' padding-block (some go tighter; see the components) |
| `--gutter` / `px-gutter` | 20 | 36 | 57 | 64 | Page side padding |
| `--grid-gap` / `gap-x-gap` | 16 | 22 | 30 | 32 | Column gap |
| `--handoff` | 48 | 66 | 89 | 96 | Height of the tone gradient at a section's top |
| `--nav-offset` / `pt-nav` | 80 | 80 | 84 | 84 | Top clearance under the floating nav; `scroll-margin-top` |
| `--stage-phone-weave` | `min(102.7vw + nav-offset, 64svh)` | | | | Height of the sticky weave band below 1024 |
| `--stage-phone-lotus` | `40svh` | | | | Height of the sticky lotus band below 1024 |

Redesign v2 values (docs/07 §2). `--beat-min` is gone: a beat is as tall as its copy. `--space-section-sm` starts at 32, not the brief's 40, to keep the Vietnamese phone page under 12.5 screens.

Inner rhythm (use these, nothing in between):
- eyebrow → headline: `space-3`
- heading → its paragraph: `space-6` (<1024) / `space-8` (≥1024)
- paragraph → action (button or link): `space-8` / `space-12`
- section header → section body (grid, gallery, list): `space-12` / `space-16`, or `space-24` where PLAN.md says so
- stacked cards: `space-6` (<768) / `space-8` (≥768)

### Grid and widths

| Viewport | Columns | Side gutter | Column gap | Content width |
|---|---|---|---|---|
| 375 | 4 | 20 | 16 | 335 |
| 768 | 8 | 36 | 22 | 696 |
| 1280 | 12 | 57 | 30 | 1166 |
| 1920 | 12 | 64 + auto | 32 | 1440 (`--wrap-max`), centred |

Breakpoints (Tailwind): base = 375 layout, `md` (48rem / 768) = 768 layout, `lg` (64rem / 1024) = the 1280 layout (split layouts and sticky stages start here), `3xl` (120rem / 1920) only where PLAN.md lists a change. In PLAN.md, "cols a–b" means `col-start-{a} col-end-{b+1}` at that breakpoint.

`Container` = `mx-auto w-full max-w-[calc(var(--wrap-max)+2*var(--gutter))] px-gutter`. `Grid` = `grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-x-gap`.

Full-bleed things (glows, the canvas, section backgrounds) ignore the container. Text never does.

### Section rhythm: tone and handoff

Two tones only: `--cream` and `--paper`. They are nearly the same lightness, so tone changes read as a shift in temperature, never as a band. A section's background layer is:

```
background-color: var(--tone);
background-image: var(--glow, none), linear-gradient(to bottom, var(--from) 0, var(--tone) var(--handoff));
```

`--from` is the previous section's tone. When `from == tone` the gradient is flat. **Never a hard edge, never a border between sections.** Where two sections share a tone and need separating (Craft → Partner), use a 1 px `--line-hair` rule inside the container.

Home order: H0 cream (dawn glow) → H1 cream → H2 paper → H3 paper (hairline) → H4 cream (blush glow) → H5 cream (blush glow) → H6 paper → H7 cream → H8 paper → Footer cream (dusk glow).

### Radii

| Token / utility | Value | Use |
|---|---|---|
| `--round-field` / `rounded-field` | 12 px | Inputs, textarea, Todo marker |
| `--round-frame` / `rounded-frame` | 16 px | Photo frames, product images, video |
| `--round-card` / `rounded-card` | 28 px | DictionaryCard, PillarCard, InvolveCard hover fill, mobile menu sheet |
| `--round-pill` / `rounded-pill` | 999 px | NavPill, buttons, language toggle |

Nested corners: inner radius = max(0, outer - padding). Cards have ≥ 24 px padding, so anything inside a card is square or has its own small radius. A child is never rounder than its parent.

### Glows and elevation

There are no grey drop shadows anywhere. Depth is light.

| Token | Where | Content allowed inside its bright core |
|---|---|---|
| `--glow-dawn` | H0 hero, PageHeader on inner pages | `--fg-heading` / `--fg-strong` only |
| `--glow-blush` | H4, H5 (stage side) | `--fg-strong` only |
| `--glow-dusk` | Footer | `--fg-strong` / `--fg-heading` only |
| `--still-seed` / `--still-loom` / `--still-bloom` | Phase 1 `SceneStage` fills | none (stages never hold text) |
| `--elev-nav` | NavPill, mobile menu sheet | n/a |
| `--elev-lift` | Hover on buttons and interactive cards (the soft pink glow) | n/a |
| `--elev-halo` | Optional soft ring beside the focus outline | n/a |

Glows are CSS gradients on the section background layer: no `filter: blur()`, no animated glows, nothing on a scrolling element. `backdrop-filter` is allowed only on the fixed NavPill.

### Layers

`--z-section-bg` -1 · `--z-canvas` 0 · `--z-content` 1 · `--z-nav` 50 · `--z-menu` 60 · `--z-skip` 70 · `--z-progress` 80 · `--z-dev` 90. No other z-index values.

### Tailwind mapping (now live in `src/app/globals.css`, which is the source of truth; verified to compile on tailwindcss 4.3.5)

Differences in the shipped file: Tailwind scans `src/` only (`source("../")`), the default text colour on `html` is `--fg-strong` (ink, safe on any surface; body copy sets `text-ink-soft` explicitly), and a reduced-motion block drops movement from all transitions. The original snippet:

```css
@import "tailwindcss";
@import "../styles/tokens.css";

@theme inline {
  --color-*: initial; /* removes Tailwind's palette: no stray grays or whites */
  --color-plum-ink: var(--plum-ink);   --color-cream: var(--cream);
  --color-paper: var(--paper);         --color-blush-line: var(--blush-line);
  --color-lotus-pink: var(--lotus-pink); --color-petal-soft: var(--petal-soft);
  --color-peach-glow: var(--peach-glow); --color-stem-mint: var(--stem-mint);
  --color-ink: var(--ink);             --color-ink-soft: var(--ink-soft);

  --font-serif: var(--ff-display);
  --font-sans: var(--ff-body);

  --text-hero: var(--fs-hero);   --text-hero--line-height: var(--lh-hero);   --text-hero--letter-spacing: var(--ls-display);
  --text-h2: var(--fs-h2);       --text-h2--line-height: var(--lh-h2);       --text-h2--letter-spacing: var(--ls-display);
  --text-quote: var(--fs-quote); --text-quote--line-height: var(--lh-quote); --text-quote--letter-spacing: var(--ls-heading);
  --text-h3: var(--fs-h3);       --text-h3--line-height: var(--lh-h3);       --text-h3--letter-spacing: var(--ls-heading);
  --text-h4: var(--fs-h4);       --text-h4--line-height: var(--lh-h4);       --text-h4--letter-spacing: var(--ls-heading);
  --text-lead: var(--fs-lead);   --text-lead--line-height: var(--lh-lead);
  --text-body: var(--fs-body);   --text-body--line-height: var(--lh-body);
  --text-ui: var(--fs-ui);       --text-ui--line-height: var(--lh-ui);       --text-ui--letter-spacing: var(--ls-ui);
  --text-caption: var(--fs-caption); --text-caption--line-height: var(--lh-caption); --text-caption--letter-spacing: var(--ls-caption);

  --radius-field: var(--round-field); --radius-frame: var(--round-frame);
  --radius-card: var(--round-card);   --radius-pill: var(--round-pill);
  --shadow-lift: var(--elev-lift);    --shadow-nav: var(--elev-nav);
  --ease-out: var(--curve-out);       --ease-in-out: var(--curve-in-out);

  --spacing-section: var(--space-section); --spacing-section-sm: var(--space-section-sm);
  --spacing-gutter: var(--gutter);         --spacing-gap: var(--grid-gap);
  --spacing-nav: var(--nav-offset);
  --container-wrap: var(--wrap-max);
  --breakpoint-3xl: 120rem;
}

@layer base {
  html { background-color: var(--bg-page); color: var(--fg-body); font-family: var(--ff-body);
         -webkit-text-size-adjust: 100%; font-synthesis: none; }
  body { font-size: var(--fs-body); line-height: var(--lh-body); overflow-wrap: break-word; hyphens: manual; }
  h1, h2, h3, h4 { font-family: var(--ff-display); color: var(--fg-heading); font-weight: var(--fw-display); text-wrap: balance; }
  p { text-wrap: pretty; }
  ::selection { background: var(--selection-bg); color: var(--plum-ink); }
  :focus-visible { outline: var(--focus-width) solid var(--focus-color); outline-offset: var(--focus-offset); }
  [id] { scroll-margin-top: var(--nav-offset); }
}
```

Utilities you get: `bg-cream`, `text-plum-ink`, `font-serif`, `text-h2` (with its line-height and tracking), `rounded-card`, `shadow-lift`, `ease-out`, `py-section`, `px-gutter`, `gap-x-gap`, `pt-nav`, `max-w-wrap`, `3xl:`. Tailwind's own `ease-in` and `ease-linear` still exist; do not use them for UI.

---

## 5. Components

Shared rules for every interactive element:
- **hover** only inside `@media (hover: hover)`. It *raises* contrast or adds light, never lowers it.
- **focus-visible**: the global outline (2 px plum, 3 px offset). Never remove it. Add `--elev-halo` where noted.
- **active**: `scale(var(--press-scale))` over `--dur-press`.
- **disabled**: `opacity: .45`, `cursor: not-allowed`, no hover or lift. On links use `aria-disabled="true"` plus `pointer-events:none`. Disabled controls are exempt from contrast but must still look like controls.
- Touch target ≥ `--target-min` (44 px).
- Transitions name their properties (`transform, box-shadow, background-color, color`), never `all`, with `--curve-out`. Never `ease-in` or `linear` on UI.

### NavPill (`src/components/layout/NavPill.tsx`, client)
- **Shape**: fixed, `top: var(--nav-top)`, height `--nav-h` (52 px, kit max 56), `rounded-pill`, background `--cream-a86` + `backdrop-filter: blur(16px) saturate(1.2)`, 1 px `--line-hair` border, `shadow-nav`, `z-index: var(--z-nav)`. Inner padding `space-1` (4 px), so 44 px items fit.
- **≥1024**: centred (`left:50%; translate:-50% 0; width:max-content`). Content: Logo, then 4 links (Collections, About, Get involved, Contact; Home is the logo) at `text-ui`, colour `--plum-ink`, `px-4`, height 44, `gap-1`, then a 1 px × 20 px `--line-hair` divider, then LanguageToggle.
- **<1024**: spans `left/right: var(--gutter)`. Logo on the left; LanguageToggle plus the Menu button (44 × 44, icon only, `aria-label` = `nav.openMenu` / `nav.closeMenu`, two 1.5 px plum lines that morph into an X over `--dur-menu`) on the right.
- **Mobile menu**: a disclosure, not a modal. The button has `aria-expanded` and `aria-controls="nav-menu"`. The panel sits `top: calc(100% + var(--space-2))` under the pill, full pill width: opaque `--cream`, `rounded-card`, 1 px `--line-hair` border, `shadow-nav`, padding `space-6`. Links are stacked in `font-serif text-h3` plum, min-height 56, with hairlines between. It enters with opacity 0→1 and translateY(-8px→0) over `--dur-menu` `--curve-out`. It closes on link click, Escape (focus goes back to the button), outside pointerdown, focus leaving the nav, or 24 px of scroll. **Body scroll is never locked** (kit §0.1).
- **Link states**: rest plum. Hover: a 1 px `--lotus-pink` underline grows from the left (scaleX over `--dur-hover`). Focus-visible: the global outline with `rounded-pill`. Active: press scale. Current page (`aria-current="page"`): a permanent 1.5 px **plum** underline (9.99:1 on the glass) so the state does not depend on pink.
- **Hide/show**: after `scrollY > 120`, a downward delta > 6 px sets `data-hidden` (translateY(calc(-100% - var(--nav-top) - 8px)) over `--dur-nav` `--curve-out`); an upward delta > 6 px clears it. Always shown when `scrollY ≤ 120`, while focus is inside, and while the menu is open. Use a passive scroll listener throttled with rAF. With reduced motion it never hides.
- **SkipLink** (`src/components/layout/SkipLink.tsx`) comes first in the body: `nav.skipToContent` → `#main`. It is `sr-only` until focused, then fixed at top-left with `--z-skip`, a plum pill with cream text.

### Logo / placeholder (`src/components/ui/Logo.tsx`)
- Until GIEO's SVG exists: a home link whose accessible name is `meta.siteName` + `nav.home`, showing the letters "GIEO" in **Be Vietnam Pro 500**, `text-ui`, `--ls-logo-placeholder` (0.12em), plum, `min-width: 96px`, 44 px hit area. **No Playfair, no swash I, no lotus, no circle.** In dev only it adds a 1 px dashed `--ink-soft` outline and `title="TODO(logo-svg)"`.
- When the SVG arrives: `<img src="/brand/gieo-logo.svg" alt="GIEO">` at its intrinsic ratio, width ≥ 96 px, clear space equal to the height of its "O". Plum on light backgrounds. Phase 2 adds the lotus draw-on (`--dur-draw`) in the nav once and in the footer on view.

### LanguageToggle (`src/components/layout/LanguageToggle.tsx`, client)
- `role="group"`, `aria-label` = `nav.language`. Two 44 × 44 hit areas, each with a centred 36 × 32 chip, showing "VI" and "EN" in `text-ui` 500.
- **Current locale**: a `<span aria-current="true">` with a plum chip and cream text. It is not a link.
- **Other locale**: a next-intl `Link` to the same pathname (keep the hash) with `locale`, `hrefLang`, `lang`, and `aria-label` = `nav.switchTo` ("Tiếng Việt" / "English"). Rest: plum text. Hover: a `--petal-soft-a40` chip. Focus-visible: the outline with `rounded-pill`. Active: press scale.

### Button / ButtonLink (`src/components/ui/Button.tsx`)
- **Base**: inline-flex, centred, `min-height: 48px`, `px-6`, `rounded-pill`, `text-ui` 500, text centred and **allowed to wrap** (Vietnamese labels), no fixed height. No icons, no arrows.
- `variant="primary"`: `bg-plum-ink text-cream`. Hover: translateY(`--lift`) + `shadow-lift`. Focus: outline + `--elev-halo`. Active: translateY(0) plus press scale.
- `variant="secondary"`: transparent, 1 px plum border, plum text. Hover: `--petal-soft-a40` fill + lift + `shadow-lift`.
- `variant="quiet"`: renders as a TextLink with a 44 px minimum hit area.
- `size="sm"`: min-height 40, `px-4` (inside the menu only).
- ButtonLink is the same visual on `<Link>`/`<a>`. Use ButtonLink for navigation and Button only for form submits and toggles.

### TextLink (`src/components/ui/TextLink.tsx`)
Inline links in copy: plum text, underline always on, `text-decoration-color: var(--lotus-pink)`, `text-decoration-thickness: max(1.5px, .08em)`, `text-underline-offset: .2em`. Hover and focus: decoration turns `--plum-ink` at 2 px. Focus-visible: the global outline. External links get `rel="noopener"` and no icon.

### DictionaryCard (`src/components/home/DictionaryCard.tsx`), H1
- `<article>` on a `--paper` surface over the cream section, 1 px `--line-hair` border, `rounded-card`, padding `space-6` (375) / `space-8` (768) / `space-12` (≥1024), `max-width: 40rem`.
- Line 1: `home.meaning.word` as the section's `<h2>` in `font-serif italic text-quote`, plum. Beside it on the baseline, with gap `space-3`: `pos` ("v.") and `pron` ("/zɛw/") in `font-sans text-ui`, `--fg-body`.
- Line 2 (`space-2` below): `gloss` in `font-serif text-h3` roman, plum.
- A 1 px `--line-hair` rule with `my-6`.
- `body` in `text-body` `--fg-body`, max `--measure`.
- Not interactive: no states.

### PullQuote (`src/components/ui/PullQuote.tsx`)
- `<figure><blockquote>` in `font-serif italic text-quote`, plum, `max-width: 24ch`, `text-wrap: balance`.
- Opening mark: `blockquote::before { content: "\201C"; content: "\201C" / ""; }` in `--lotus-pink` at 1.6em, line-height 1, decorative. At ≥1024 it hangs: absolute, `left: -0.55em`, `top: -0.1em`. Below 1024 it sits as a block above the text with `mb-2`.
- No citation line (there is no key for one). Not interactive.

### PillarCard (`src/components/ui/PillarCard.tsx`)
- `<article>` on a `--paper` surface, 1 px `--line-hair` border, `rounded-card`, padding `space-6` / `space-8`. Title `<h3>` in `font-serif text-h3` 500, plum. Body `text-body` `--fg-body` with `mt-4`, max `--measure-narrow` at ≥1024.
- No hover (not interactive). Phase 3 state `data-active="true"`: border turns `--petal-soft` and `shadow-lift` fades in over `--dur-fade`. Inactive cards stay fully opaque; never dim text.

### ProductTile (`src/components/ui/ProductTile.tsx`)
- `variant="compact"` (home H2): an `<li>` holding only the product name, `font-serif text-h4` 500 plum, with a 1 px `--line-hair` top rule and `pt-3`. Phase 5 adds `data-active` while its 3D product is on screen: the name gains a 1.5 px plum underline.
- `variant="full"` (/collections): `<li>` → image frame (`aspect-[4/5]`, `rounded-frame`, `bg-paper`, real product photo via next/image) → name (`text-h4`, `mt-4`). **Until a real photo exists the image frame is not rendered**: the tile shows the name only, plus `<Todo tag="products">` in dev. Never a mock or generated product image.
- Never a price. The partner credit (`footer.madeWith` / `collections.noinep.credit`) is shown once per product group, not per tile. Not interactive in Phase 1.

### InvolveCard (`src/components/ui/InvolveCard.tsx`)
- An index row, not a boxed card. `<li>` with a 1 px `--line-hair` top rule (the last item also gets a bottom rule) holding a full-width `<a class="relative block">`: padding-block `space-8` (375) / `space-12` (≥1024), no padding-inline (the label lines up with the h2), label in `font-serif text-quote` roman (not italic), plum.
- **Hover**: a `--petal-soft-a24` fill fades in behind the row (`::before`, `z-index:-1`, `inset: 0 calc(-1 * var(--space-4))` so it bleeds 16 px into the gutter, `rounded-card`) together with `shadow-lift`, and the label moves `translateX(var(--space-2))`, all over `--dur-hover` `--curve-out`. **Focus-visible**: the outline on the `<a>` with `rounded-card`. **Active**: press scale. **Disabled**: not used. Text stays plum on the fill (11.9:1).
- Phase 2 may add the ≤ 4° tilt (`--tilt-max`).

### Footer (`src/components/layout/Footer.tsx`)
- A cream section layer with `--glow-dusk`. `pt-section`, `pb-12`. **All footer text is `--fg-strong` or plum** because it sits on the glow.
- Content: Logo; `common.signoff` in `font-serif italic text-h3` plum; the 4 page links as a plain `<ul>` in `text-ui` (not a second `<nav>` landmark); contact (email as a TextLink showing the address, Instagram, Facebook, each labelled by a `footer.*Label` caption); a hairline; `footer.supportedBy`, `footer.madeWith` and `footer.rights` in `text-caption`. Layout is in PLAN.md.
- Phase 2: the logo lotus draws on when the footer enters view (needs the SVG).

### Form fields (`src/components/ui/Field.tsx`: `TextField`, `TextArea`)
- `<label>` above: `text-ui` 500, `--fg-strong`, `mb-2`. All fields are required. No placeholders and no floating labels.
- Control: full width, `min-height: 52px` (textarea `min-height: 10rem`, `resize: vertical`), `px-4 py-3`, `bg-cream` (fields sit on paper), 1 px `--line-field` border (4.70:1), `rounded-field`, `text-body` `--fg-strong`.
- **Hover**: border plum. **Focus-visible**: border plum plus the global outline at 2 px offset. **Invalid** (`aria-invalid="true"`, only after a submit attempt): 2 px plum border plus a message below in `text-caption` `--fg-strong`, linked by `aria-describedby`. Phase 1 uses the browser's `validationMessage`; translated keys are requested in PLAN.md. **Disabled**: `opacity:.45`. Autofill: keep the cream background with `box-shadow: inset 0 0 0 100px var(--cream)`.
- Submit: Button primary. `contact.form.note` sits under it in `text-caption` `--fg-body`.

### PhotoFrame (`src/components/ui/PhotoFrame.tsx`), consent-gated
- Props: `photo: { src, width, height, alt: string, consent: boolean } | undefined`, `ratio` (CSS aspect-ratio string), `sizes`, optional `caption`.
- **If `photo?.consent !== true`, it renders `null` in production.** In dev it renders the empty frame in `--petal-soft-a24` with `<Todo tag="photos">`.
- Frame: `<figure>` → a `div` with `position:relative; overflow:hidden; aspect-ratio: ratio; border-radius: var(--round-frame); background: var(--paper)` → next/image `fill`, `object-cover`. The frame holds **no text** (it clips). Optional `<figcaption>` below: `text-caption` `--fg-body`, `mt-3`. A caption must never pair a child's name with her face, village or school.
- EXIF is stripped in the image pipeline before files reach `public/`. Phase 2: the inner image layer is scaled 1.12 and translated 6–10% for parallax (transform only).

### PhotoPrint (`src/components/ui/PhotoPrint.tsx`), consent-gated
- How GIEO's photos sit on the page since `docs/09-feedback.md` F3: a print laid down by hand, in the still-lifes' manner. Same consent and alt-text gate as PhotoFrame (it takes the same `photo`).
- A thin cream mat (`--print-mat`), `--round-print` corners, `--elev-print` (or `--elev-print-plum` on plum), a tilt of -3 to 3 degrees (`--tilt`), an optional petal glow behind. It has no crop: `ratio` and `focus` only frame a photo; anything that must not be published is cut out of the file itself (assets/photos/SOURCES.md).
- Motion: it fades, rises and turns to its tilt as it enters view (`data-enter`); the picture drifts inside its window (`data-drift`). Static under reduced motion.
- Caption, upright under the print, only for products: the name, the kind, or the partner credit. No other photo has a caption.

### SceneStage (`src/components/ui/SceneStage.tsx`)
- `<div data-scene-stage="seed|weave|lotus" aria-hidden="true">` with the size and position given in PLAN.md. The still is painted on `.scene-stage::before` from an inline `--still` custom property (no `backgroundImage`). No children, no text, no drawing.
- Phase 2: at Full tier the shared canvas reads the stage's `getBoundingClientRect()` and `html[data-canvas="ready"]` fades the `::before` still out over `--dur-fade`. Phase 6: Lite and Still put their media in a box centred on the stage and fade the still out on `data-media="ready"`.

### SproutCue (`src/components/home/SproutCue.tsx`)
- Inline SVG, `aria-hidden`, 24 × 56: one vertical stem path and one small leaf curve, stroke `--stem-mint` 1.25 px, `fill:none`, round caps. No text and no "scroll down" pill. Phase 2: the stroke draws on once after load (`--dur-draw`); static under reduced motion. This is the seed motif, not the logo, so drawing it is allowed.

### Todo marker (`src/components/ui/Todo.tsx`), dev only
- `<Todo tag="photos" />` returns `null` when `process.env.NODE_ENV === 'production'`.
- In dev: inline-flex, `text-caption` in `--ff-body`, text `TODO(photos)`, `bg-peach-glow`, `text-ink`, 1 px dashed plum border, `rounded-field`, `px-2 py-1`, `z-index: var(--z-dev)` when absolutely placed. The `block` prop gives a 6rem-tall centred placeholder.
- An empty content string (`""`, listed under `todo` in `_meta.json`) means the component reading it renders nothing at all: no heading without its body, no empty wrapper.

### Container / Grid / Section (`src/components/ui/`) / PageHeader (`src/components/layout/`)
- `Container.tsx` exports `Container` and `Grid` (see §4).
- `Section.tsx`: props `tone: 'cream'|'paper'`, `from?: 'cream'|'paper'` (defaults to tone), `glow?: 'dawn'|'blush'|'dusk'`, `pad?: 'default'|'sm'|'none'`, `id`, `labelledBy`, `scene?: 'seed'|'weave'|'lotus'` (sets `data-scene`). It renders `<section class="relative {className}">` → background layer (§1 layering contract) → `<div class="relative z-(--z-content) flex flex-1 flex-col">{children}</div>` (flex so the hero's Container can fill `min-h-svh`; harmless elsewhere). Set `--tone`, `--from` and `--glow` as inline CSS variables pointing at tokens (`'var(--paper)'`), never at colours.
- `PageHeader.tsx` (inner pages): Section cream with dawn glow, `<h1>` in `text-h2`, intro in `text-lead`. Layout is in PLAN.md.

---

## 6. Motion

House curve `--curve-out` = `cubic-bezier(.16,1,.3,1)` (kit §5). `--curve-in-out` = `cubic-bezier(.65,0,.35,1)` ≈ GSAP `power2.inOut` (petals, crossfades).

| Token | Value | Use |
|---|---|---|
| `--dur-press` | 120 ms | Press feedback |
| `--dur-hover` | 180 ms | Hover colour, lift, glow, underline |
| `--dur-nav` | 240 ms | Nav hide/show |
| `--dur-menu` | 280 ms | Mobile menu sheet, burger morph |
| `--dur-fade` | 300 ms | Image fade, reduced-motion crossfades |
| `--dur-reveal` | 700 ms | Headline line reveal (rise `--reveal-distance` 24 px + fade) |
| `--dur-draw` | 1200 ms | Logo lotus and sprout stroke draw-on |
| `--stagger` | 60 ms | Between revealed lines |
| `--lift` / `--press-scale` / `--tilt-max` | -2 px / 0.98 / 4° | Hover lift, press, card tilt |

Boot: `MotionBoot` (in the locale layout, before `<main>`) waits for `load` + idle + `BOOT_DELAY_MS` (2.5 s), or the first wheel/touch/pointer/key, before it detects the tier and dynamically imports `motion-runtime` (gsap, Lenis). three and R3F load only at Full tier on a page with a `[data-scene-stage]`. Reveals hide only headings still below the fold when JS boots.

JS-only constants for Phase 2 (in `src/lib/motion.ts`): Lenis `duration: 1.1, smoothWheel: true, syncTouch: false`; ScrollTrigger `scrub: 0.8`; pin max 150vh; scene crossfade over the last 10% / first 10%; hero idle bob 6 px on a 3 s sine; pointer or gyro tilt ≤ 3°; photo parallax 6–10% plus fade-scale 1.04→1; load hairline 2 px `--lotus-pink` at `--z-progress`, finished in < 1.2 s.

Rules:
- Animate only `transform` and `opacity` (plus `stroke-dashoffset` for line art). Never layout properties, never `filter: blur` on scroll.
- One orchestrated moment per viewport. No fade-up on every section in Phase 1. Line reveals arrive in Phase 2, on headings only.
- Text never waits for 3D, fonts or JS. Content must be visible with JS off.
- **Reduced motion** (`prefers-reduced-motion: reduce`): tokens.css zeroes `--reveal-distance`, `--lift`, `--press-scale` and `--tilt-max`, so components degrade to fades automatically. JS must also skip Lenis, scrubbing, parallax, the nav hide, the hero bob and pointer tilt, and show the Still tier with `--dur-fade` crossfades.

---

## 7. Do and don't

**Do**
- Use role tokens (`--fg-heading`, `--fg-strong`, `--fg-body`) for text, and brand tokens only for fills and decoration.
- Put `--fg-strong` (ink) on anything inside a glow or hover fill. Use `--fg-body` (ink-soft) only on flat cream or paper.
- Keep one accent per viewport: a single pink underline or glow is enough.
- Set Vietnamese first: check every layout in VI at 375 px before EN.
- Reserve every media box with `aspect-ratio` (CLS < 0.05).
- Use real `<button>`, `<a>`, `<nav>`, `<main id="main">`, and headings in order (one h1 per page).
- Name the partner Chie Dù Pù Dù Pà wherever products appear.
- Leave TODO content empty and let the component render nothing.

**Don't**
- Don't write a hex value outside tokens.css, or a font size, radius, shadow or z-index outside the tokens.
- Don't use `--lotus-pink` (or mint, petal, peach or blush) as a text colour on light surfaces.
- Don't set the hero "GIEO" or the logo placeholder in a way that imitates the wordmark: no swash, no lotus, no circle badge, no logo lockup.
- Don't use tracked ALL-CAPS eyebrows, `→` arrows on buttons, numbered 01/02/03 markers, emoji, icon sets, "scroll down" pills, badges or counters.
- Don't add black or dark sections, chrome, glass cards, neon, grain overlays, grey drop shadows or 1 px grey borders.
- Don't use identical-card grids. Use asymmetric placements, index rows and marginal notes.
- Don't use pity framing, "saving" language, staged-poverty imagery, or invented statistics, prices, testimonials, team members or pattern meanings.
- Don't put a face with a name together, or use any photo without `consent: true`.
- Don't use `overflow:hidden` around text, letter-splitting, scroll snap, scroll locking, popups, cookie bars or a preloader.
- Don't use Tailwind colour opacity modifiers, `ease-in`, `linear` or `transition: all`.

---

## 8. Agent prompt guide

You are building the GIEO site, an editorial, Vietnamese-first, cream-paper page that whispers. Before writing JSX, open PLAN.md at your section and copy its column spans, tokens and keys exactly; make no design decisions of your own. Text colours are `text-plum-ink` (headings), `text-ink` (lead text and anything on a glow) and `text-ink-soft` (body on flat cream/paper). Pink is never text. Every string comes from `src/content/*.json` by the key PLAN.md names; an empty string renders nothing. Sections use `Section` (tone, from, glow) and the layering contract in DESIGN.md §1; never put a background on `body` or `main`. Check your section in Vietnamese at 375 px and 1440 px, and look for clipped diacritics and overflow.

---

## 9. Open questions (for Maxwell / GIEO)

1. **Pink text**: 01-brand.md §3 allows `--lotus-pink` text at 24 px+, but it measures 2.51:1 on cream and fails the 3:1 large-text minimum, which would cost the Lighthouse ≥ 95 accessibility target. This system forbids pink text and moves pink into light and underlines. If GIEO's brand kit has a deeper pink, it can be added as a new token after checking. TODO(brand)
2. **Link underline** at rest is the brand's pink (2.51:1). The underline itself is the non-colour cue and is always visible; on hover and focus it turns plum. A strict WCAG 1.4.11 audit might ask for a plum underline at rest instead.
3. **IPA glyph**: `ɛ` in "/zɛw/" is in neither web font, so it renders in the system fallback. Options: keep it (current), load a tiny IPA-capable subset, or drop the pronunciation (it is DRAFT format).
4. **Hero headline "GIEO"** is typeset in plain Playfair, as 02-content.md specifies. It must not look like the logo (no swash I, no lotus). Confirm with GIEO that a typeset name next to the real logo is acceptable. TODO(logo-svg)
5. **Brand hexes** are eyedropped estimates. Correct them in tokens.css only, then re-run `contrast.mjs`. `--ink-soft` passes with only 0.20 to spare (4.70:1): any lightening breaks body text.
6. **Font loading** (resolved, measured in Phase 1): next/font was replaced by self-hosted faces because it served every Google subset. Vietnamese pages pulled latin-ext copies of every face (`ă đ ĩ ũ ơ ư` sit in both ranges, and latin-ext is declared later, so it wins), 18 files and 226 KB in total. Now only latin and vietnamese are declared, the unused Playfair 600 is gone, and Playfair 500 and italic (below the fold everywhere) load after `load`. `layout.tsx` preloads only Playfair 400 latin, the hero face, which also works on Windows builds (next/font emitted no preload there). `ɛ` (U+025B) was in latin-ext but in neither font, so it already fell back to a system glyph: no change.
7. **Locale cookie**: next-intl writes a `NEXT_LOCALE` cookie. It is functional, so no banner is needed, but confirm this is acceptable under the kit's no-cookie-bar stance.

---

## 10. Redesign v2: "First light, closer" (2026-11-16)

Brief: `docs/07-redesign.md`. Same palette, same two typefaces, same ethics rules. What changed is scale, density and where the 3D comes from. This section wins over §1, §5 and §6 for the home page.

### What is different from §1

- **Bigger type, less air.** "It whispers" now means calm, not empty. The hero word spans the content width; h2 is 56 → 132 px; the partner name, the dictionary headword, the kinetic band and the footer line use `text-mega` (56 → 200 px). Section padding is roughly half what it was (§4). A screen that is mostly blank cream is a bug: `scripts/qa-density.mjs` fails any screen with under 12 % ink (10 % on phones) or an empty band over 35 % of its height.
- **One dark section.** Weave is `tone="plum"`: plum-ink ground, cream type. Everything inside takes its colours from the `[data-tone="plum"]` scope (§2), so no component has a dark variant.
- **Films, not a live canvas.** The three scenes are Blender renders scrubbed as video by scroll (`ui/FilmStage.tsx`, `src/lib/film-stage.ts`, files in `public/film/`, contract in docs/07 §4). The R3F canvas is no longer mounted on the home page; its files and dependencies are still in the repo. The `--z-canvas` layer of the layering contract (§1) now holds the page thread.
- **Two ornaments.** The page thread and the running stitch (below). Still no icons, badges or 01/02/03 markers.
- **Marginalia still, but overlapping.** Stills are large, have transparent margins and run under type and past the gutters. Copy that sits over a still gets `relative z-1`.

### New and changed components

**FilmStage** (`ui/FilmStage.tsx`, replaces `SceneStage` on the home page). An empty `aria-hidden` box with `data-film="seed|weave|lotus"`; the runtime adds canvases after `load`. Never text or a drawing inside. Until the film draws (or if `public/film/<scene>/` is missing) it shows the old `--still-*` gradient. The film is fitted with `cover` on the manifest's `focus`. The set (`l` / `ls` / `p`) is picked once at load from the box's shape and size.

**Hero text box** (`home/Sow.tsx`, `#hero` rules in `globals.css`). While the first screen is pinned, the three beats of copy share one box: from the nav offset down to the film's `textSafe` bottom edge, and from the content's left edge to its `textSafe` right edge. The runtime writes those edges to `--safe-x` / `--safe-y` from the manifest. The beats crossfade in place; they never travel over the soil or the sprout, and there is no scrim. Beat type is sized so the Vietnamese copy fits that box at 375×667 (the intro line drops to 18 px below about 740 px of height; the dictionary entry is capped in `svh`). `scripts/qa-redesign.mjs` (`hero`) checks it.

**Weave stage** (`.weave-stage` in `globals.css`). The weave film is square and its warp beat fills the whole frame, so the canvas must never show its own edge:
- below 1024: the canvas is wider than the screen (it bleeds off both sides) and sits at the bottom of a sticky band `--stage-phone-weave` tall, under the nav pill; the band's plum backdrop hides the copy scrolling beneath it;
- 1024–1279: `min(100 %, 100svh − nav)` square, centred in cols 7–12;
- from 1280: `min(109svh, 68.5vw)` square, running off the top, bottom and right of the screen, with a soft mask on its left edge where it meets the copy.

**Partner credit in the stage.** The film shows the products, so `collections.noinep.credit` sits at the foot of the sticky stage, under them, in `text-caption` cream on plum. It is the section's only copy of the credit. The runtime lights it (`data-on`) at the drape beat, when the cloth starts to become a product, and it stays lit; without the runtime it is simply visible. No product is on screen without it.

The numbers came from the measured boxes of the earlier film's three products; the Nối Bag and the Nếp Keychain at rest sit within 17 to 83 % of the canvas, so each stays fully on screen from 1280 to 1920 wide. `scripts/qa-redesign.mjs` (`weave`) re-measures this from the key frames; re-run it if the film is re-rendered with different framing.

**StillLife** (`home/StillLife.tsx`, data in `src/lib/stills.ts`). One Blender still: empty alt text, no caption that states a fact. Its box takes the render's own proportions (read from the file). A still that shows products carries `collections.noinep.credit` as its `figcaption`. Sizes: the Hands stills are 40–50 % of the content width on desktop; the three in Journal are a third of the screen each. It unveils with a `clip-path` wipe on entering view (`data-enter`) and its layers drift at different speeds (`data-drift`). The runtime fetches and decodes a held still a screen and a half before it unveils: the clip hides it from the browser's lazy loading, so without that the image arrived after its own wipe and its first paint dropped a frame.

**Thread** (`home/Thread.tsx`). One SVG path from the seed film's `threadExit` point to the end of the page, drawn by scroll with `stroke-dashoffset`, stem mint shifting to lotus pink. Loose S-curves down one gutter; at a seam between sections it leans further in, deepest in the gap between their copy, taking the same half wave as any other sway to get there and back (a swing made inside the gap alone is too tight and reads as a kink); it stays in the gutter and never crosses text. Its first point is exactly under the film's stem, including on a phone, where the crop puts the stem at the screen's edge. It sits on `--z-canvas`: above section backgrounds, under copy, films and stills. `Section` takes a `thread="left|right"` prop to say which gutter.

**Running stitch** (`Hairline`). Hairlines are dashed "stitches" (`--line-hair`) that sew in when they enter view. A neutral sewing mark, not a pattern claim.

**Deck** (`home/Bloom.tsx`, `ui/PillarCard.tsx`). Where all three cards fit on screen the runtime sets `data-deck="stack"`: each card sticks with its title row showing and the next slides over it, in step with its petal. `--deck-peek` is how much of a card stays in view under the next: enough for the whole title (5.5rem from 768, where the card's padding and title line are taller). The runtime gives each card the bottom margin that makes all three run out of room at once, so the stack leaves the screen as one and no card rides up over the title before it. Otherwise they follow on in flow. The lotus film's lowest 12 % is faded with a CSS mask: its stem runs out of the frame and would otherwise end in a flat cut. On phones the lotus is a sticky band 40svh tall with an opaque cream backdrop; cards pass beneath it, never over it.

**KineticBand** (`home/KineticBand.tsx`). The three pillar titles as one line of `text-mega` italic, once filled and once in 1.5 px outline, sliding sideways with scroll. `aria-hidden`; static under reduced motion. The clip (`overflow-x: clip`) is on its own wrapper.

**Weave quote.** Split on spaces (never letters) into `data-word` spans that light up with scroll; still one sentence for a screen reader. Product names take `data-active` in step with the film.

**InvolveCard** (replaces the §5 entry). Still an index row; the label is now `text-h2` (56 → 132 px) and the row padding is `py-4` / `lg:py-5`, so the three rows read as one large list.

**Footer** (replaces the §5 entry; site-wide). Above the small print the page ends on `home.journal.heading`, set as a `<p>` (the Journal section owns the heading) in italic serif, sized from its length to run the content width in one line on desktop (about 130 px in English and 91 px in Vietnamese at 1440) and wrapping on phones, never under 44 px. Five seeds fall towards it in the space above the line. They stop short of the letters: next to Vietnamese type a seed touching the line reads as a tone mark.

### Motion (replaces the JS constants in §6 for the home page)

- **Pins:** the first screen holds for `[data-hero-run]`: 150svh on phones, 190svh from 1024 (docs/07 §1 allows the hero up to 300svh if a new block of text arrives at least every 70svh; here the longest wait is 29 % of the run, 55svh on desktop). The run is long so that each thing to read gets a hold with the film at rest behind it: headline over the seed in the air, dictionary entry over the sprout, initiative line over the thread. Film and copy move only between holds, and together. Weave and Bloom do not pin a section; their film stages are `position: sticky` beside (or above) copy that keeps scrolling, so a new block of text is always arriving. No snap, no scroll-jacking; Lenis on wheel only.
- **Pins need height.** All sticky rules sit behind `@media (min-height: 37.5rem)` and `motion-safe`. Under reduced motion nothing sticks: copy is in normal flow and each film shows its key stills.
- **Copy is visible by default.** CSS shows everything; hidden-before-reveal states exist only under `html[data-motion="on"]`, which the runtime sets once it is running.
- **LCP.** The `h1` word paints in the first frame; its entrance (`word-in`) is a transform only.
- **Never `overflow-x: hidden` on an ancestor of a sticky element.** Bleeding elements clip with `overflow-x: clip` (or `overflow: clip` on the Weave section) on their own wrapper.
- Scrubbed tweens are `ease: none`; reveals use `--curve-out`. Transform, opacity, `clip-path` and `stroke-dashoffset` only.

### Checks

`node scripts/qa-density.mjs` (density, page length, type floors) and `node scripts/qa-redesign.mjs` (overflow at 375, reduced motion, no JS, LCP at 4× CPU, hero text box, hero strip of 11 shots per run, weave frames 45 / 120 / 140 / 169 with the credit on screen under each product, pillar titles whole in the deck, scroll trace) against a production build on port 3101; both write to `qa/redesign/`. `scripts/qa-motion.mjs` and `scripts/render-fallbacks.mjs` belong to the R3F build and no longer describe the home page.
