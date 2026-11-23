# GIEO: Page and Section Plan

Build each section exactly as written here. The visual rules (colours, type, states) are in `DESIGN.md`, tokens in `src/styles/tokens.css`, and copy in `src/content/{vi,en}.json`. Nothing in this file is a choice left to the builder; if something is missing, ask instead of inventing.

## 0. How to read this file

- **Widths.** Every layout gives four columns: **375** (Tailwind base), **768** (`md:`), **1280** (`lg:`, applies from 1024 up), **1920** (`3xl:`, written only where it differs from 1280; otherwise "= 1280").
- **"cols a–b"** means `col-start-{a} col-end-{b+1}` on the page `Grid` (4 / 8 / 12 columns). "row n" means `row-start-{n}`.
- **Spacing** is written as Tailwind steps that equal the tokens (`mt-12` = `--space-12` = 48 px). Allowed steps: 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 40, plus `py-section`, `py-section-sm`, `px-gutter`, `gap-x-gap`, `pt-nav`.
- **Text styles** are named by utility: `font-serif text-h2 text-plum-ink` and so on. Every heading is serif plum unless stated. "Lead" means `text-lead font-light text-ink max-w-[var(--measure-lead)]`. "Body" means `text-body text-ink-soft max-w-[var(--measure)]`.
- **Keys** are full paths in `src/content/*.json`. Strings are read with next-intl (`getTranslations` in server components). An empty string means TODO: render nothing (see §5).
- **Section frame.** Every block below is a `Section` (`src/components/ui/Section.tsx`) with the props given, containing `Container` and then `Grid` (`src/components/ui/Container.tsx`). Import shared primitives from `@/components/ui`. Its background layer follows the layering contract in DESIGN.md §1.
- **Contact constants** (not copy) live in `src/lib/site.ts`: `EMAIL = 'gieovietnam2026@gmail.com'`, `INSTAGRAM_URL = 'https://www.instagram.com/gieo.vietnam'`, `INSTAGRAM_HANDLE = '@gieo.vietnam'`, `FACEBOOK_URL = 'https://www.facebook.com/gieo.vietnam'`, `FACEBOOK_LABEL = 'facebook.com/gieo.vietnam'`.

## 1. Files

| Folder | File | Kind | Notes |
|---|---|---|---|
| `src/components/layout/` | `NavPill.tsx` | client | includes the mobile menu (built) |
| | `LanguageToggle.tsx` | client | built |
| | `SkipLink.tsx` | server | built |
| | `Footer.tsx` | server | built |
| | `PageHeader.tsx` | server | inner pages, §3 |
| `src/components/ui/` (barrel: `index.ts`) | `Container.tsx` (exports `Container`, `Grid`) | server | DESIGN.md §4 (built) |
| | `Section.tsx` | server | props `as`('section'\|'footer'\|'header'\|'div', default section), `tone`, `from`, `glow`, `pad`('default' = `py-section`, 'sm' = `py-section-sm`, 'none'), `id`, `labelledBy`, `scene`, `className` (on the section). Renders `data-tone`. Content wrapper is always `relative z-(--z-content) flex flex-1 flex-col` (built) |
| | `Glow.tsx` | server | `kind: 'dawn' \| 'blush' \| 'dusk'`; Section renders it from `glow` (built) |
| | `Typography.tsx` (`Eyebrow`, `Heading` level display/h2/h3 + `as` + `italic`, `Prose` variant body/lead, `Hairline`) | server | built |
| | `Button.tsx` (`Button`, `ButtonLink`) | server | variants primary/secondary; ButtonLink takes internal paths or http/mailto (built) |
| | `TextLink.tsx`, `AnyLink.tsx` | server | built |
| | `Logo.tsx` | server | placeholder until TODO(logo-svg) (built) |
| | `Todo.tsx` | server | null in production (built) |
| | `PhotoFrame.tsx` | server | consent-gated |
| | `PullQuote.tsx` | server | |
| | `PillarCard.tsx` | server | |
| | `ProductTile.tsx` | server | `variant: 'compact' \| 'full'` |
| | `InvolveCard.tsx` | server | |
| | `Field.tsx` (`TextField`, `TextArea`) | server | |
| | `SceneStage.tsx` | server in Phase 1 | `scene: 'seed' \| 'weave' \| 'lotus'` |
| `src/components/home/` | `Hero.tsx`, `SproutCue.tsx`, `Meaning.tsx`, `DictionaryCard.tsx`, `Craft.tsx`, `Partner.tsx`, `NextGen.tsx`, `Pillars.tsx`, `VisionMission.tsx`, `Journal.tsx`, `Involve.tsx` | server | H0–H8 |
| `src/components/pages/` | `CollectionBlock.tsx`, `DepartmentList.tsx`, `InvolveSection.tsx`, `ProgramList.tsx`, `ContactLinks.tsx`, `ContactForm.tsx` (client) | | §3 |
| `src/lib/` | `site.ts` (constants above, plus `NAV_LINKS`, `SITE_URL`), `seo.ts` (`alternates(locale, href)` for page metadata), `cx.ts`, `photos.ts` (manifest, §5) | | `motion.ts` arrives in Phase 2 |

**App shell** (`src/app/[locale]/layout.tsx`, inside `<body>`, with no wrapper elements carrying classes, transforms or backgrounds):

```
<SkipLink />          // nav.skipToContent → #main
<NavPill />
{/* Phase 2: <SceneCanvas /> (fixed, z 0) goes here, before main */}
<main id="main">{children}</main>
<Footer />
```

The page files render fragments of sections only; `main` lives in the layout. Remove the `<main>` currently in `src/app/[locale]/page.tsx` when the shell is built.

Home page order (`src/app/[locale]/page.tsx`), since the 2026-11-16 redesign: `Thread, Sow, Weave, Hands, Bloom, KineticBand, VisionMission, Journal, Involve`. (Before: `Hero, Meaning, Craft, Partner, NextGen, Pillars, VisionMission, Journal, Involve`.)

---

## 2. Home

> **Rebuilt on 2026-11-16 to `docs/07-redesign.md`. §2a below is the home page as built. The H0–H8 blocks after it describe the earlier build and are kept for history only**; the Footer block still holds for its small print, and §3 onwards (other routes) is unchanged. `home/Partner.tsx` and `home/DictionaryCard.tsx` are still used by `/about`.
>
> **Corrected in November 2026 to `docs/09-feedback.md` (GIEO's first feedback):** the type is a step smaller (DESIGN.md §3, §4), the products are the Nối Bag and the Nếp Keychain (and nothing else), the weave film ends on the bag, and real photographs stand where several stills stood. §2a and the /collections block in §3 say so; DESIGN.md §11 has the summary.

## 2a. Home as rebuilt (redesign v2)

Files: `src/components/home/{Thread,Sow,Weave,Hands,Bloom,KineticBand,VisionMission,Journal,Involve,StillLife}.tsx`, `ui/FilmStage.tsx`, `src/lib/{film-stage,motion-runtime,stills}.ts`, films and stills in `public/film/` (rendered by `blender/`, not edited by hand). Visual rules: DESIGN.md §10. Every section is `pad="none"` and sets its own padding; "cols" are on the 12-column grid from 1024, and everything is one column below that unless stated.

| # | Section (`id`) | Tone | Copy keys | Layout | Scroll behaviour |
|---|---|---|---|---|---|
| — | `Thread` | — | none | One SVG over the whole page on the z 0 layer | Drawn by scroll from the seed film's `threadExit`; mint to pink; one gutter, never across text |
| S0 | `Sow` (`#hero`) | cream, dawn glow | `home.hero.{eyebrow,headline,sub}`, `home.meaning.{word,pos,pron,gloss,body,intro,ibNote}` | First screen (`100svh`, min 34rem): `film: seed` full-bleed; `h1` = eyebrow + "GIEO" spanning the content width (the LCP element); sub line under it. Then three beats of copy: dictionary entry (`h2` "gieo" + pos + pron, gloss), `meaning.body`, `meaning.intro` + stitch + `ibNote` | With the runtime up and ≥ 600 px of height the screen sticks for `[data-hero-run]` (150svh phone, 190svh from 1024). Copy and film change together and rest together (`HERO_FILM`, `HERO_WORD`, `HERO_BEATS` in `motion-runtime.ts`, in shares of the run): the headline holds over the seed in the air (to 12 %); the seed falls and sprouts (film frames 0–95) while the headline shrinks away towards the nav; the dictionary entry holds over the sprout (29–45 %); `meaning.body` passes while the stem grows into the thread (frames 95–149); the initiative line holds over the thread from 77 % to the end. The beats crossfade inside the film's `textSafe` box. Otherwise the beats read in flow under the first screen |
| S1 | `Weave` (`#craft`) | **plum** | `home.craft.{beat1,quote,beat3,cta}`, `home.craft.products.{bag,lipstick}.{name,kind}`, `collections.noinep.{name,credit}` | Copy in cols 1–6 (1–5 from 1280): `beat1` (h3 size), the quote (`text-quote`, 48 px from 1280), `beat3` + the two product names in one list under the label "Nối Nếp" (name large, kind small) + button. `film: weave` in a sticky stage, with the partner credit at the stage's foot (its one copy in this section; it lights up at the drape beat, film frame 89, and stays): cols 7–12 and bleeding off the top, bottom and right from 1280; a band at the top of the screen below 1024 (DESIGN.md §10, "Weave stage") | Stage is sticky for the whole section while copy scrolls. Film: thread → warps → cloth as the first two beats pass, then the cloth drapes onto the bag and the film ends there, on frame 129. The bag rests once (54svh on wide screens, 48svh on phones) while the product list is on screen and the stage is still pinned. Both names get `data-active` together once the bag is at least half in; nothing lights for a product the film does not show. Quote words light up one by one |
| S2 | `Hands` (`#partner`, `#next-gen`) | paper | `home.partner.{name,body}`, `home.nextGen.body`, `home.craft.products.{bag,lipstick}.{name,kind}`, `collections.noinep.credit`, `photos.{bag-pink,lipstick-on-bag,loom-cloth}.alt` | Partner name in `text-mega` italic. Beside it, where the products still stood: the photo `bag-pink`, with `lipstick-on-bag` as a smaller second frame, each labelled with its product's name and kind, and one credit line for the pair. Partner body under the name. Lower: the photo `loom-cloth` where the cloth still stood, with `nextGen.body` as a lead beside it. Phone: one column in the same order | Photographs sit in calm frames (`--round-frame` corners, at most 60vw wide from 1024) |
| S3 | `Bloom` (`#pillars`) | cream from paper, blush glow | `home.pillars.{heading,economic,education,mentorship}.*` | Heading cols 1–7. `film: lotus` in a sticky stage, cols 1–6 (square, up to 72svh); three `PillarCard`s in cols 7–12. Phone: lotus band 40svh at the top of the screen, cards beneath | Lotus opens a petal per card; the film's lowest 12 % fades out so the stem does not end in a cut. Where all three cards fit, they stack as a deck with each whole title showing (`--deck-peek`, 5.5rem from 768) and leave together; otherwise they follow in flow |
| — | `KineticBand` | cream | pillar titles (decorative, `aria-hidden`) | One line of `text-mega` italic, filled then outlined | Slides sideways with scroll; static under reduced motion |
| S4 | `VisionMission` (`#vision-mission`) | paper from cream | `home.visionMission.{visionTitle,vision,missionTitle,mission}` | Two columns from 1280 with a stitched vertical divider; stacked with a horizontal stitch below that | Divider sews in on entering view. The two headings start their line reveal as they cross the foot of the screen, not at the usual 88 %: they follow the decorative band, and the screen needs something to read |
| S5 | `Journal` (`#journal`) | cream from paper | `home.journal.{heading,body,closing}`, `photos.<id>.alt` | Heading cols 1–7, lead cols 1–6. Six real photographs, `01-loom-weaver` to `06-valley`, in the six-slot module (`SLOT` in `Journal.tsx`; the table under H7 in §2b is the pre-09 placement, kept as history). The grid replaces the rail of stills. Two to a row under 768, three to a row from 768, two loose rows of three on the 12-column grid from 1024, each frame a step off its neighbour, so the section stays near a screen and a half at 1440×900. `closing` (EN only so far) follows the grid | Each photo drifts a little inside its frame (parallax); none under reduced motion |
| S6 | `Involve` (`#involve`) + `Footer` | paper from cream; footer cream, dusk glow | `home.involve.{heading,shop.label,mentor.label,partner.label}`, `footer.*`, `home.journal.heading` | Heading, then three index rows with `text-h2` labels. Footer: contacts and page links, then the closing line (`home.journal.heading` as a `<p>`, one line across the content width on desktop) with five seeds above it, then the small print | Rows lift on hover; seeds fall towards the line as the footer scrolls in |

Rules that hold for every row above:

- **Copy added since the redesign** (`docs/09-feedback.md`): the product names and kinds, the Nối Nếp name, tagline and body, and one alt text per photo. All are `DRAFT` keys; `docs/02-content.md` says where each comes from. Weave still has no visible heading (there is no key for one, §6); the label "Nối Nếp" stands over its product list.
- **Stills state nothing.** Empty alt text, no caption.
- **Photographs** (`docs/09-feedback.md` F3): a real GIEO photo may be used when no person in it can be recognised; hands and a back view are fine; no face of a child or a teenager without GIEO's consent for that photo. Each has a row in `assets/consent.csv` and a source in `assets/photos/SOURCES.md`. Alt text says what is visible and nothing else. A product photo carries its product's name and kind and one partner credit line; no other photo has a caption.
- **The products are two**, in this order everywhere: `bag` (Nối Bag / Túi Nối, brocade handbag) and `lipstick` (Nếp Keychain / Móc Nếp, lipstick holder). The film shows only the bag.
- **Reduced motion or no JS:** nothing sticks, nothing is hidden, the films show key stills, the band and thread are static.
- **Page length** (checked by `scripts/qa-density.mjs`): at most 15.1 screens at 1440×900 and 14.0 at 390×844, in both languages, **counting the hero as one screen**. This is `docs/09-feedback.md` F1's rule that the page gets shorter: no page may be longer than the home page was before GIEO's first feedback (15.11 and 14.00 counted screens in English). The first cap, 12.0 and 12.5, stopped holding when `docs/08-fuller.md` lengthened the product run. After the feedback the home page counts 14.00 (EN) and 14.58 (VI) at 1440×900, and 12.98 and 13.67 at 390×844. A pinned film is not spaced-out content, so the scroll the hero's pin takes beyond its own 100svh is taken off the total before the cap is applied. The script prints both the raw and the counted length.

## 2b. Home before the redesign (history)

### H0 Hero (`home/Hero.tsx`, `home/SproutCue.tsx`, `ui/SceneStage.tsx`)

- **Purpose**: say who GIEO is in one breath. The headline is the LCP element. Signature moment 1 (the seed) lives in the stage.
- **Keys**: `home.hero.eyebrow`, `home.hero.headline`, `home.hero.sub`.
- **Section**: `tone="cream" glow="dawn" pad="none" scene="seed" id="hero" labelledBy="hero-title" className="min-h-svh motion-safe:min-h-[200svh]"`.
- **Container**: `flex flex-1 flex-col`, no padding of its own (Phase 4: the text block takes the top padding and, at ≥1024, `lg:pb-24`; the stage wrapper takes `pb-16` only under reduced motion). **Grid**: `flex-1 grid-rows-[1fr]`. The Section also passes `glowClassName="motion-safe:bottom-auto motion-safe:h-svh"` so the dawn glow stays one screen tall.
- **Markup**: a text block `div` holding: `<h1 id="hero-title">` with two spans, the eyebrow (`block text-ui font-medium text-ink max-w-[24ch]`, `lang="en"`, because the string is English in both locales) and the headline (`block mt-3 font-serif text-hero text-plum-ink`; this is the only use of `text-hero` and its 0.95 line-height); then `<p>` sub as Lead with `max-w-[30ch]`; then `<SproutCue>` (24 × 56, left-aligned, `mt-12 lg:mt-16`; on mobile it points down at the seed). After the text block comes a `sticky` wrapper holding `<SceneStage scene="seed">`.
- **Headline rule**: "GIEO" is set as plain Playfair roman text. No swash, no lotus, no logo graphics around it (DESIGN.md §9.4).

| Element | 375 | 768 | 1280 | 1920 |
|---|---|---|---|---|
| Text block (`div` with h1 + sub) | cols 1–4 | cols 1–6 | cols 1–6, row 1, `self-end` | = 1280 |
| Sub `<p>` | `mt-6` | `mt-6` | `mt-8` | = 1280 |
| SceneStage | cols 1–4, `mt-8`, `justify-self-end`, `w-[min(100%,44svh)] aspect-square` | cols 3–8, `mt-8`, `justify-self-end`, `w-[min(100%,50svh)] aspect-square` | cols 7–12, row 1, `self-center justify-self-center mt-0`, `w-[min(100%,60svh)] aspect-square` (60svh keeps the headline above the fold on 768 px-tall laptops) | = 1280 |
| Glow | dawn core over the eyebrow and headline (text is ink/plum, so it is safe) | same | same | same |

- The table's columns and widths still hold. Its vertical placement (`self-end`, `mt-8`, `self-center`) now applies only under reduced motion; see the Phase 4 note below for everyone else.
- **Phase 1 placeholder**: the stage is filled with `--still-seed` (a soft peach-to-blush orb). Nothing is drawn.
- **Phase 2+**: the headline drifts up 8% slower than scroll; line reveal on the sub; the sprout stroke draws on once. Phase 4 (as built): the Section becomes `motion-safe:min-h-[200svh]` and only the stage pins (a `sticky` wrapper, 100svh). The text block is not pinned: on phones it is taller than the viewport, so pinning the whole Container would cut the seed off, and kit §0.3 wants the text moving while the 3D scrubs. The text block (`data-hero-drift`) drifts down 8% of the hero height over the scroll, as one unit. The canvas draws the seed in the stage's rect; idle bob 6 px / 3 s; pointer tilt ≤ 3°. The thread exits the top of the frame into H1/H2. Reduced motion: Still tier, no bob, no drift.

### H1 Meaning (`home/Meaning.tsx`, `home/DictionaryCard.tsx`)

- **Purpose**: define the word, then who GIEO is.
- **Keys**: `home.meaning.word` (the section's `<h2 id="meaning-title">`), `.pos`, `.pron`, `.gloss`, `.body`, `.intro`, `.ibNote`.
- **Section**: `tone="cream" pad="default" id="meaning" labelledBy="meaning-title"`.
- **DictionaryCard** is built as in DESIGN.md §5. The note is a `div`: `<hr class="h-px border-0 bg-blush-line">`, then `<p>` intro as Body with `mt-6 max-w-[var(--measure-narrow)]`, then `<p>` ibNote `mt-4 text-caption text-ink-soft`.

| Element | 375 | 768 | 1280 | 1920 |
|---|---|---|---|---|
| DictionaryCard | cols 1–4 | cols 1–7 | cols 2–7, row 1 | = 1280 |
| Note | cols 1–4, `mt-12` | cols 2–8, `mt-12` | cols 9–12, row 1, `self-end mt-0` | = 1280 |

- **Phase 2+**: Phase 4 scrolls this section over the tail of the hero pin. No motion of its own beyond the heading line reveal.

### H2 Craft (`home/Craft.tsx`, `ui/PullQuote.tsx`, `ui/ProductTile.tsx` compact, `ui/SceneStage.tsx`)

- **Purpose**: thread → brocade → product. Signature moment 2.
- **Keys**: `home.craft.beat1`, `.quote`, `.beat3`, `.cta`, one `.products.*` key per product, `footer.madeWith` (partner credit, once). That build's product list was wrong: the products are the Nối Bag and the Nếp Keychain (§2a, `docs/09-feedback.md` F2).
- **Section**: `tone="paper" from="cream" pad="default" scene="weave" id="craft"`. There is no visible heading (the docs give none); see §6 for the requested sr-only key.
- **Beats** are `div`s. At ≥1024 beats 1 and 2 are `min-h-[var(--beat-min)] flex flex-col justify-center`; beat 3 is `lg:min-h-[85svh]` so the products get time. Sticky travel is about 109svh, under the 150vh limit. Phase 5 (as built): the stage is CSS sticky, the scene is scrubbed by one proxy per beat (`weave-thread`, `weave-warps`, `weave-weave`, `weave-drape`, then one per product), and the compact tiles take `data-active` at ≥1024 while their product is on screen.
  - Beat 1: `<p>` beat1 as Lead.
  - Beat 2: `<PullQuote>` with `home.craft.quote`.
  - Beat 3: `<p>` beat3 as Body; then `<ul class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">` with one `ProductTile variant="compact"` per product; then `<p class="mt-4 text-caption text-ink-soft">` footer.madeWith; then `ButtonLink variant="primary" href="/collections"` with `home.craft.cta`, `mt-8 lg:mt-12`.

| Element | 375 | 768 | 1280 | 1920 |
|---|---|---|---|---|
| SceneStage | cols 1–4, first in source order, `aspect-square` | cols 2–7, `aspect-[4/3]` | cols 7–12, rows 1–3 (`row-span-3`), `self-start sticky top-[var(--stage-top)] h-[var(--stage-h)]` | = 1280 |
| Beat 1 | cols 1–4, `mt-12` | cols 1–7, `mt-12` | cols 1–5, row 1, `mt-0` | = 1280 |
| Beat 2 (quote) | cols 1–4, `mt-16` | cols 1–8, `mt-16` | cols 1–6, row 2, `mt-0` | = 1280 |
| Beat 3 | cols 1–4, `mt-16` | cols 1–7, `mt-16` | cols 1–5, row 3, `mt-0` | = 1280 |

- **Phase 1 placeholder**: the stage is filled with `--still-loom`. No brocade pattern is drawn or faked; the real pattern comes from GIEO's scans (TODO(products)).
- **Phase 2+**: Phase 5 maps this section's scroll (≈150vh) to the weave scene. Instanced threads enter in Beat 1, the loom fills during Beat 2, and the products turn one after another during Beat 3, each setting `data-active` on its compact tile. Nothing pins: the stage is CSS sticky and the HTML keeps scrolling.

### H3 Partner (`home/Partner.tsx`)

- **Purpose**: credit Chie Dù Pù Dù Pà.
- **Keys**: `home.partner.name` (as `<h2 id="partner-title">`), `home.partner.body`.
- **Section**: `tone="paper" from={from ?? 'paper'} pad="sm" id="partner" labelledBy="partner-title"`.
- **Props**: `heading?: string`, `from?: 'cream' | 'paper'`. On /about a heading is passed: render it as the `<h2 id="partner-title">` (`font-serif text-h2`, cols 1–4 / 1–8 / 1–12, `mb-12`) after the thread and before the name, and render the partner name as `<h3>` with the same style as below.

| Element | 375 | 768 | 1280 | 1920 |
|---|---|---|---|---|
| Top thread `<hr class="h-px border-0 bg-blush-line">` | cols 1–4, `mb-12` | cols 1–8, `mb-12` | cols 1–12, `mb-16` | = 1280 |
| Name, `font-serif text-h3 font-medium` | cols 1–4 | cols 1–8 | cols 1–4 (no explicit row: auto-placement puts it after the thread or heading) | = 1280 |
| Body (Lead) | cols 1–4, `mt-6` | cols 1–7, `mt-6` | cols 6–11, `mt-0` (auto-placement keeps it on the name's row) | = 1280 |

- **Phase 2+**: heading line reveal only.

### H4 NextGen (`home/NextGen.tsx`)

- **Purpose**: the reason behind everything; the lead-in to the pillars.
- **Keys**: `home.nextGen.body` (570 EN / 617 VI chars).
- **Section**: `tone="cream" from="paper" glow="blush" pad="default" id="next-gen"`. No visible heading (§6).
- **Body** is Lead (ink, because it can sit at the edge of the blush glow). The glow sits on the left at 22% / 55%, away from the text.

| Element | 375 | 768 | 1280 | 1920 |
|---|---|---|---|---|
| Body `<p>` | cols 1–4 | cols 2–8 | cols 5–11 | cols 5–10 |

- **Phase 2+**: Phase 3 may start the lotus bud rising at the bottom-left as this section ends (the canvas sits behind the copy).

### H5 Pillars (`home/Pillars.tsx`, `ui/PillarCard.tsx`, `ui/SceneStage.tsx`)

- **Purpose**: the three pillars, one petal each. Signature moment 3.
- **Keys**: `home.pillars.heading` (`<h2 id="pillars-title">`, `font-serif text-h2 max-w-[var(--measure-heading)]`), `home.pillars.economic.title/.body`, `.education.title/.body`, `.mentorship.title/.body`.
- **Section**: `tone="cream" glow="blush" pad="default" scene="lotus" id="pillars" labelledBy="pillars-title"`.
- **Cards**: `<ul role="list">` with three `<li>`, each holding a `PillarCard` (`<h3>` title). At ≥1024 each `li` is `min-h-[var(--beat-min)] flex items-center` (≈150svh total) and the card is `w-full`.

| Element | 375 | 768 | 1280 | 1920 |
|---|---|---|---|---|
| h2 | cols 1–4 | cols 1–6 | cols 1–6, row 1 | = 1280 |
| SceneStage | cols 1–4, `mt-12 aspect-square` | cols 2–7, `mt-12 aspect-[4/3]` | cols 1–6, row 2, `mt-16 self-start sticky top-[var(--stage-top)] h-[var(--stage-h)]` | = 1280 |
| Cards `ul` | cols 1–4, `mt-12`, `flex flex-col gap-6` | cols 2–8, `mt-12`, `flex flex-col gap-8` | cols 8–12, row 2, `mt-16`, no gap (the `li` min-heights space them) | cols 8–11 |

- **Phase 1 placeholder**: the stage is filled with `--still-bloom` (a soft petal radial). No lotus is drawn; the 2D lotus must come from GIEO's SVG.
- **Phase 3 (decided)**: the lotus is driven by six scrubbed beats (`rise`, `p1`–`p3`, `bloom`, `finale`; ScrollTrigger ids `lotus-*`, spec in `motion-runtime.ts`).
  - **≥1024:** each pillar petal follows its own card, opening as the card rises from 85% to the centre of the viewport. A card has `data-active` while its centre is in the middle half of the viewport. The cards `ul` gets `lg:pb-(--beat-min)`, a trailing half-beat, so the bloom and the finale (tilt toward a top-down view, seeds dropping toward H6) play while the stage is still sticky. Sticky travel is 124svh, under the 150vh limit.
  - **<1024:** the stage stays inline above the cards. The whole lotus plays as the stage crosses the viewport, and the cards take `data-active` from their own position, because a sticky stage on a phone would sit under opaque cards.
  - **Not built:** the flatten-and-crossfade to the logo's 2D line lotus is `TODO(logo-svg)` and waits for GIEO's SVG.

### H6 Vision and Mission (`home/VisionMission.tsx`)

- **Purpose**: the long-view statements.
- **Keys**: `home.visionMission.visionTitle`, `.vision`, `.missionTitle`, `.mission`.
- **Section**: `tone="paper" from="cream" pad="default" id="vision-mission"`. Two `<article>`s, each an `<h2>` (`font-serif text-h2`) plus a Body `<p>` (`mt-6 lg:mt-8`).

| Element | 375 | 768 | 1280 | 1920 |
|---|---|---|---|---|
| Vision article | cols 1–4 | cols 1–7 | cols 1–5, row 1 | = 1280 |
| Mission article | cols 1–4, `mt-16` | cols 2–8, `mt-16` | cols 7–12, row 1, `mt-24` | cols 7–11 |

- **Phase 2+**: lotus seeds from H5 drift down through the top of this section (canvas behind the copy). Heading line reveals.

### H7 Journal (`home/Journal.tsx`, `ui/PhotoFrame.tsx`)

- **Purpose**: GIEO's season so far, in real consented photos.
- **Keys**: `home.journal.heading` (`<h2 id="journal-title">`, `font-serif text-h2 max-w-[var(--measure-heading)]`), `.body` (Lead), `.closing` (empty in VI: TODO(copy-vi), render nothing).
- **Data**: `journalPhotos` from `src/lib/photos.ts`, filtered to `consent === true`. If none remain, **the gallery `ul` is not rendered** (dev shows six empty frames with `<Todo tag="photos">`).
- **Section**: `tone="cream" from="paper" pad="default" id="journal" labelledBy="journal-title"`.

| Element | 375 | 768 | 1280 | 1920 |
|---|---|---|---|---|
| h2 | cols 1–4 | cols 1–8 | cols 1–8 | = 1280 |
| Body | cols 1–4, `mt-6` | cols 1–6, `mt-8` | cols 1–6, `mt-8` | = 1280 |
| Gallery `ul` (inner grid `grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-x-gap items-start`) | cols 1–4, `mt-16`, `gap-y-8` | cols 1–8, `mt-16`, `gap-y-12` | cols 1–12, `mt-24`, `gap-y-16` | = 1280 |
| Video slot (TODO(video): not rendered until the file exists) | cols 1–4, `mt-16`, `aspect-video` | cols 1–8, `mt-16` | cols 2–11, `mt-24` | = 1280 |
| Closing `<p>`, `font-serif italic text-h3 text-plum-ink max-w-[30ch]` | cols 1–4, `mt-16` | cols 2–8, `mt-16` | cols 6–12, `mt-24` | = 1280 |

**Gallery placement** (repeat every 6 photos; `n` is the 1-based index within the module):

| n | 375 | 768 | 1280 / 1920 |
|---|---|---|---|
| 1 | cols 1–4, `aspect-[4/5]` | cols 1–5, `aspect-[4/5]` | cols 1–5, `aspect-[4/5]` |
| 2 | cols 2–4, `aspect-[3/2]` | cols 4–8, `aspect-[3/2]` | cols 7–12, `aspect-[3/2]`, `mt-24` |
| 3 | cols 1–4, `aspect-square` | cols 1–5, `aspect-square` | cols 2–4, `aspect-square` |
| 4 | cols 2–4, `aspect-[4/5]` | cols 4–8, `aspect-[4/5]` | cols 6–9, `aspect-[4/5]`, `mt-16` |
| 5 | cols 1–4, `aspect-[3/4]` | cols 1–5, `aspect-[3/4]` | cols 10–12, `aspect-[3/4]`, `mt-32` |
| 6 | cols 2–4, `aspect-video` | cols 4–8, `aspect-video` | cols 3–10, `aspect-video` |

`sizes` for next/image: `(min-width: 1024px) 40vw, (min-width: 768px) 60vw, 90vw`. Superseded by docs/09: `Journal.tsx` now uses `(min-width: 1024px) 36vw, (min-width: 768px) 30vw, 46vw` and its own `SLOT` placements.

- **Video (when it exists)**: a poster image (PhotoFrame) plus a centred `Button variant="secondary"` whose label is a requested key (§6). Click to play, with sound only after the click; no autoplay.
- **Phase 2+**: per-image parallax of 6–10% inside each frame (transform only) and fade + scale 1.04→1 on enter. None under reduced motion.

### H8 Involve (`home/Involve.tsx`, `ui/InvolveCard.tsx`)

- **Purpose**: three ways in.
- **Keys**: `home.involve.heading` (`<h2 id="involve-title">`, `font-serif text-h2`), `home.involve.shop.label` → `/collections`, `.mentor.label` → `/get-involved#mentor`, `.partner.label` → `/get-involved#partner`. Use next-intl's `Link` so the locale is kept.
- **Section**: `tone="paper" from="cream" pad="default" id="involve" labelledBy="involve-title"`.

| Element | 375 | 768 | 1280 | 1920 |
|---|---|---|---|---|
| h2 | cols 1–4 | cols 1–8 | cols 1–8 | = 1280 |
| `<ul role="list">` of 3 InvolveCards | cols 1–4, `mt-12` | cols 1–8, `mt-12` | cols 1–10, `mt-16` | cols 1–9 |

- **Phase 2+**: optional ≤ 4° tilt on hover; nothing on scroll.

### Footer (`layout/Footer.tsx`)

- **Keys**: `common.signoff`, `nav.collections/.about/.getInvolved/.contact`, `footer.emailLabel/.instagramLabel/.facebookLabel`, `footer.supportedBy`, `footer.madeWith`, `footer.rights`, `meta.siteName`, `nav.home`. Values come from the `site.ts` constants.
- **Section**: `as="footer" tone="cream" glow="dusk" pad="none"` (no `from`: globals.css fades the footer from the tone of the last section in `main`, via `:has()`). Container: `pt-section pb-12`. **All text is `text-ink` or `text-plum-ink`** (it sits on the glow).
- Signoff: `<p class="font-serif italic text-h3 text-plum-ink">`. Page links: a plain `<ul>` (not a second `<nav>` landmark) of links in `text-ui font-medium text-plum-ink` with the pink hover underline. Contact: a `<dl>` where each `dt` is a `text-caption text-ink` label and each `dd` is a TextLink in `text-ui` (EMAIL, INSTAGRAM_HANDLE, FACEBOOK_LABEL). Credits: `text-caption text-ink`.

| Element | 375 | 768 | 1280 | 1920 |
|---|---|---|---|---|
| Logo + signoff (`mt-6` between) | cols 1–4 | cols 1–8 | cols 1–4, row 1 | = 1280 |
| Nav list | cols 1–4, `mt-12`, `grid grid-cols-2 gap-x-gap gap-y-3` | cols 1–4, `mt-16`, `flex flex-col gap-3` | cols 7–8, row 1, `flex flex-col gap-3` | = 1280 |
| Contact `dl` | cols 1–4, `mt-12`, `flex flex-col gap-6` | cols 5–8, `mt-16` (row 2) | cols 10–12, row 1 | = 1280 |
| Hairline | cols 1–4, `mt-12` | cols 1–8, `mt-16` | cols 1–12, row 2, `mt-24` | = 1280 |
| Credits (supportedBy, madeWith) | cols 1–4, `mt-8`, stacked `gap-2` | cols 1–8, `mt-8`, `flex flex-wrap gap-x-8 gap-y-2` | cols 1–8, row 3, `mt-8`, same flex | = 1280 |
| Rights | cols 1–4, `mt-4` | cols 1–8, `mt-4` | cols 9–12, row 3, `mt-8 text-right` | = 1280 |

- **Phase 2+**: the logo lotus draws on when the footer enters view (needs TODO(logo-svg)).

---

## 3. Other routes

All inner pages start with `PageHeader` and end with the shared Footer. Section tones alternate as listed.

Photographs on the inner pages (`docs/09-feedback.md` F3): Collections takes `nep-cloth`, `bag-rows` and `lipstick-rows` (below). About takes `sewing-cloth` beside the story, where the lotus-seeds still stood, and `bag-rows` with the partner credit in the partner block, where the products still stood. Get involved and Contact take no photo: a trip picture beside "what we're building" would read as a result.

### PageHeader (`layout/PageHeader.tsx`)

- **Props**: `title`, `intro?`.
- **Section**: `as="header" tone="cream" glow="dawn" pad="none"`. Container: `pt-[calc(var(--nav-offset)+var(--space-16))] lg:pt-[calc(var(--nav-offset)+var(--space-24))] pb-16 lg:pb-24`.

| Element | 375 | 768 | 1280 | 1920 |
|---|---|---|---|---|
| `<h1>`, `font-serif text-h2 max-w-[var(--measure-heading)]` | cols 1–4 | cols 1–7 | cols 1–8 | = 1280 |
| Intro (Lead) | cols 1–4, `mt-6` | cols 1–7, `mt-6` | cols 1–6, `mt-8` | = 1280 |

### /collections (`app/[locale]/collections/page.tsx`, `pages/CollectionBlock.tsx`, `pages/PageBand.tsx`, `ui/PhotoFrame.tsx`)

As rebuilt in the fuller pass (`docs/08-fuller.md` §4) and corrected by GIEO's first feedback (`docs/09-feedback.md` F2, F3).

- **Purpose**: the collections, starting with **Nối Nếp**, made with Chie Dù Pù Dù Pà. Two products: the Nối Bag (brocade handbag) and the Nếp Keychain (lipstick holder). No prices, no wallets, no ethnic group named.
- **Keys**: `collections.title`, `collections.intro` (PageHeader); `collections.noinep.name` (`<h2>`, very large italic serif, sized from its length, never under 48 px, up to `text-mega`), `.tagline`, `.body` (Lead), `.credit` (`text-caption`); `home.craft.products.bag.name` / `.kind` and `home.craft.products.lipstick.name` / `.kind` (slab titles); `photos.nep-cloth.alt`, `photos.bag-rows.alt`, `photos.lipstick-rows.alt`; `contact.instagramLabel`, `contact.emailLabel` (order buttons until `collections.order` exists, §6).
- **CollectionBlock**: `Section tone="paper" from="cream" pad="none"`, labelled by its `<h2>`.
- **Swatch**: a PhotoFrame, `16 / 9`, 8 of 12 columns from 1024, holding the photo `nep-cloth` (cloth on a loom). A flat, straight-on scan from GIEO would replace it (TODO(products)).
- **Slabs**: a `<ul role="list">` of two plum slabs (`data-tone="plum"`, `rounded-card`), `bag` then `lipstick`. Each has the product's photograph on one half (`bag-rows`, `lipstick-rows`; 3:2 on phones) and its name (`text-h2`), kind and the partner credit on the other. The sides alternate from 1024. Not interactive, no price. There is no third tile.
- **Photos are looked up by id** in `src/lib/photos-manifest.json`, not by a file-name prefix. A photo shows only with `consent: true` (a `yes` row in `assets/consent.csv`) and its `photos.<id>.alt` in both languages (§5).
- **Order actions**: `ButtonLink variant="primary" href={INSTAGRAM_URL}` (label `contact.instagramLabel`) and `ButtonLink variant="secondary" href={'mailto:' + EMAIL}` (label `contact.emailLabel`), plus `<Todo tag="shop">`.
- **Band**: a `PageBand` of the two product names under the block.

| Element | below 1024 | from 1024 |
|---|---|---|
| h2 (collection name) | full width | full width |
| Tagline, body + credit | full width (5 of 8 columns from 768) | 6 of 12 columns |
| Swatch (`nep-cloth`) | full width, `mt-8` | 8 of 12 columns |
| Slabs `<ul>` | one column, photo above the name | photo on one half, name on the other, sides alternating |
| Order actions (`flex flex-col md:flex-row gap-4`) | stacked (a row from 768) | a row |

- More collections later: one more `CollectionBlock` per collection, alternating tone (paper, cream, paper…), each with `from` set to the previous tone.

### /about (`app/[locale]/about/page.tsx`)

Order: PageHeader → Story → Pillars → VisionMission → Departments → Team → Partner.

1. **PageHeader**: `about.title`, `about.intro`.
2. **Story**: `Section tone="paper" from="cream" pad="default" id="story"`. Contains a `DictionaryCard` (same keys as H1) and a column with `home.craft.beat1` (Lead) plus `footer.supportedBy` (`mt-6 text-caption text-ink-soft`).

   | Element | 375 | 768 | 1280 | 1920 |
   |---|---|---|---|---|
   | DictionaryCard | cols 1–4 | cols 1–7 | cols 1–6, row 1 | = 1280 |
   | Text column | cols 1–4, `mt-12` | cols 2–8, `mt-12` | cols 8–12, row 1, `self-center` | = 1280 |

3. **Pillars**: `Section tone="cream" from="paper" pad="default" id="pillars" labelledBy="about-pillars-title"`. `<h2>` `home.pillars.heading`, then a `<ul role="list">` of three `PillarCard`s (no SceneStage on /about).

   | Element | 375 | 768 | 1280 | 1920 |
   |---|---|---|---|---|
   | h2 | cols 1–4 | cols 1–6 | cols 1–6 | = 1280 |
   | `ul` (inner grid like Grid) | cols 1–4, `mt-12`, `flex flex-col gap-6` | cols 1–8, `mt-12`, `flex flex-col gap-8` | cols 1–12, `mt-16` | = 1280 |
   | Card 1 | full | full | cols 1–6 | cols 1–5 |
   | Card 2 | full | full | cols 7–12, `mt-24` | cols 8–12 |
   | Card 3 | full | full | cols 4–9, `mt-16` | = 1280 |

4. **VisionMission**: the home component as-is (`tone="paper" from="cream"`).
5. **Departments** (`pages/DepartmentList.tsx`): `Section tone="cream" from="paper" pad="default" id="departments" labelledBy="departments-title"`. `<h2>` `about.departmentsHeading`. `<ul role="list">` of 6 items: `communityDev`, `productDev`, `businessDev`, `marketing` (+ `marketingTeams`), `media` (+ `mediaTeams`), `hr`, all under `about.departments.*`. Each `li`: `<hr class="h-px border-0 bg-blush-line">`, then the name `pt-6 font-serif text-h4 font-medium text-plum-ink`, then the teams line (if any) `mt-2 text-caption text-ink-soft`.

   | Element | 375 | 768 | 1280 | 1920 |
   |---|---|---|---|---|
   | h2 | cols 1–4 | cols 1–8 | cols 1–8 | = 1280 |
   | `ul` | cols 1–4, `mt-12`, `grid grid-cols-1 gap-y-8` | cols 1–8, `mt-12`, `grid grid-cols-2 gap-x-gap gap-y-12` | cols 1–12, `mt-16`, `grid grid-cols-3 gap-x-gap gap-y-12` | = 1280 |

6. **Team**: `about.teamHeading` is `""` (TODO(team)): **render nothing** (dev `<Todo tag="team" block>`). Never invent names or photos.
7. **Partner**: `<Partner heading={t('about.partnerHeading')} from="cream" />`. The component renders its own Section; placements are as in H3.

### /get-involved (`app/[locale]/get-involved/page.tsx`, `pages/InvolveSection.tsx`, `pages/ProgramList.tsx`)

Order: PageHeader → Ways → Programs.

1. **PageHeader**: `getInvolved.title`, `getInvolved.intro`.
2. **Ways**: `Section tone="paper" from="cream" pad="default" id="ways"`. Five `InvolveSection` `<article>`s, in order: `shop`, `mentor`, `partner`, `volunteer`, `donate`. Each article has `id` = its slug (anchors used by H8), `<hr>` thread on top, `py-12 lg:py-16`, `<h2>` title (`font-serif text-h3 font-medium`), `<p>` body (Lead), and an action:
   - `shop`: `ButtonLink variant="secondary" href="/collections"` with label `common.seeCollection`, plus `<Todo tag="shop">`.
   - `mentor`: TextLink `mailto:EMAIL` showing EMAIL, plus `<Todo tag="mentor">`.
   - `partner`: TextLink `mailto:EMAIL` showing EMAIL.
   - `volunteer`, `donate`: body is `""` (TODO(volunteer), TODO(donate)), so **the whole article is not rendered** in production. Dev shows `<Todo>`. Never show a donate CTA until GIEO answers.

   | Element (inside each article, which spans all columns) | 375 | 768 | 1280 | 1920 |
   |---|---|---|---|---|
   | Title | cols 1–4 | cols 1–8 | cols 1–4, row 1 | = 1280 |
   | Body | cols 1–4, `mt-4` | cols 1–7, `mt-4` | cols 6–11, row 1, `mt-0` | cols 6–10 |
   | Action | cols 1–4, `mt-6` | cols 1–7, `mt-6` | cols 6–11, row 2, `mt-8` | = 1280 |

3. **Programs**: `Section tone="cream" from="paper" pad="default" id="programs" labelledBy="programs-title"`. `<h2>` `getInvolved.programsHeading` (`font-serif text-h2`); `<p>` `getInvolved.programsNote` (`mt-4 text-caption text-ink-soft`); a `<ul role="list">` of the 8 `getInvolved.programs.*` in key order. Each `li`: `<hr>` thread, `py-4 text-body text-ink`. These are framed as "what we're building", never as results.

   | Element | 375 | 768 | 1280 | 1920 |
   |---|---|---|---|---|
   | h2 + note | cols 1–4 | cols 1–8 | cols 1–8 | = 1280 |
   | `ul` | cols 1–4, `mt-12`, `grid grid-cols-1` | cols 1–8, `mt-12`, `grid grid-cols-2 gap-x-gap` | cols 1–12, `mt-16`, `grid grid-cols-2 gap-x-gap` | cols 1–10 |

### /contact (`app/[locale]/contact/page.tsx`, `pages/ContactLinks.tsx`, `pages/ContactForm.tsx`, `ui/Field.tsx`)

1. **PageHeader**: `contact.title`, `contact.intro`.
2. **Write to us**: `Section tone="paper" from="cream" pad="default" id="write"`.
   - **ContactLinks**: a `<dl class="flex flex-col gap-8">`. `dt` = `contact.emailLabel` / `.instagramLabel` / `.facebookLabel` (`text-caption text-ink-soft`). `dd` = a TextLink in `font-serif text-h3` showing EMAIL / INSTAGRAM_HANDLE / FACEBOOK_LABEL (`mt-2`, `break-words`).
   - **ContactForm** (client): `TextField` name (`contact.form.name`, `autocomplete="name"`), `TextField` email (`contact.form.email`, `type="email" autocomplete="email"`), `TextArea` message (`contact.form.message`), all `required`, stacked `flex flex-col gap-6`. Then `Button variant="primary" type="submit"` (`contact.form.submit`, `mt-8`), then `<p class="mt-4 text-caption text-ink-soft">` `contact.form.note`.
   - **Behaviour**: on submit, `preventDefault`, then `location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(siteName + ' · ' + name) + '&body=' + encodeURIComponent(message + '\n\n' + name + ' <' + email + '>')`. Without JS the form is hidden (a `mailto:` form action is reported as mixed content on HTTPS) and the ContactLinks beside it remain. Nothing is stored and nothing is sent to a server.

   | Element | 375 | 768 | 1280 | 1920 |
   |---|---|---|---|---|
   | ContactLinks | cols 1–4 | cols 1–8 | cols 1–5, row 1 | = 1280 |
   | ContactForm | cols 1–4, `mt-16` | cols 1–7, `mt-16` | cols 7–12, row 1, `mt-0` | cols 7–11 |

---

## 4. Phase 2+ summary

| Where | Phase | What | Reserved in Phase 1 by |
|---|---|---|---|
| Whole site | 2 | Lenis (wheel only), ScrollTrigger wiring, `useMotionTier`, `src/lib/motion.ts`, fixed `SceneCanvas` before `main`, load hairline | Layering contract (DESIGN.md §1), the `main` with no wrappers |
| Headings | 2 | Line reveal (24 px, 700 ms, 60 ms stagger), no masks | No `overflow:hidden` around text |
| Nav / footer logo | 2 | Lotus draw-on | `Logo.tsx` swap point (needs TODO(logo-svg)) |
| H0 | 4 | Seed scene, 100svh pin of the stage only (sticky wrapper) | `SceneStage scene="seed"`, `data-scene="seed"` on the section |
| H2 | 5 | Weave → products, ≈109svh of sticky travel | Sticky stage + two `--beat-min` beats and an 85svh beat 3; compact tiles take `data-active` |
| H5 | 3 | Lotus of three, ≈150vh, seeds into H6 | Sticky stage + three `--beat-min` cards; PillarCard takes `data-active` |
| H7 | 2 | Photo parallax, fade-scale | PhotoFrame `overflow:hidden` frame, fixed aspect ratios |
| All stages | 6 | Lite (scrubbed video) and Still (WebP key-frame posters) tiers, both captured from the Full tier, `?tier=` override | `SceneStage` keeps its box in every tier |

Reduced motion everywhere: Still tier, no Lenis, no scrub, no parallax, no nav hide, 300 ms fades only (tokens already zero the distances).

## 5. TODO handling

- **Empty strings** in the JSON are TODOs (listed in `src/content/_meta.json`). A component that reads one renders nothing: no wrapper, no heading without its body. Current ones: `home.journal.closing` (VI), `about.teamHeading`, `getInvolved.volunteer.body`, `getInvolved.donate.body`.
- **`<Todo tag="…">`** (`ui/Todo.tsx`) marks missing assets or answers in dev only. Tags in use: `logo-svg` (Logo), `products` (plain-background product shots and a flat scan of the cloth, both still owed by GIEO), `photos` (a photo frame with no consented photo), `video` (Journal video), `shop` (order buttons), `mentor` (mentor action), `team`, `volunteer`, `donate`, `brand` (tokens.css header).
- **Photos manifest** (`src/lib/photos-manifest.json`, written by `npm run images`, read through `src/lib/photos.ts`): one entry per file under `assets/photos/`, with `id`, `collection`, `src`, `width`, `height` and `consent`. Pages look a photo up by its id (`bag-rows`, `nep-cloth`, `01-loom-weaver`, ...), not by a file-name prefix. The alt text for a photo comes from content key `photos.<id>.alt` (added with the photo, both languages); it says what is visible and nothing else. All metadata is stripped before a file enters `public/`. **Every photo needs a matching `assets/consent.csv` row set to yes** before `consent: true`, with or without people in it: a missing row counts as no. The rule for which photos may be used at all is `docs/09-feedback.md` F3 (no recognisable person; hands and a back view are fine; no face of a child or a teenager without GIEO's consent for that photo), and `assets/photos/SOURCES.md` records where each one came from. Thirteen photos are in today.
- **Never** fill a TODO with a guess: no numbers, no names, no prices, no pattern meanings, no stock imagery.

## 6. Keys requested from the content owner (DRAFT; until they exist, follow the fallback)

| Key | Purpose | Fallback until it exists |
|---|---|---|
| `home.craft.heading` | sr-only `<h2>` for H2 | No heading |
| `home.nextGen.heading` | sr-only `<h2>` for H4 | No heading |
| `collections.order` | Label for the order actions ("Order via Instagram or email") | Buttons labelled `contact.instagramLabel` / `contact.emailLabel` |
| `contact.form.errors.required`, `contact.form.errors.email` | Translated field errors | Browser `validationMessage` |
| `home.journal.playVideo` | Video play button label | Video not rendered (TODO(video)) |
| `photos.<id>.alt` | Alt text per photo, VI + EN. Written for the thirteen photos in `assets/photos/` (`DRAFT`) | Photo not rendered |

## 7. Phase 1 acceptance (from 05-build-plan.md, plus this plan)

- Every route renders at 375 / 768 / 1280 / 1920 in **both** languages with no horizontal scroll, no clipped diacritics and no overlapping text. Check VI first.
- Screenshots go in `qa/phase1/` at 375 and 1440 for every route.
- No hex value outside `src/styles/tokens.css`: `grep -rnE "#[0-9a-fA-F]{3,8}\b" src --include=*.tsx --include=*.ts --include=*.css` hits only tokens.css.
- Lighthouse mobile ≥ 95 on all four categories; CLS < 0.05; hero h1 is the LCP element.
- `node scripts/check-content.mjs` prints OK; `node D:/claude-scratch/gieo/contrast.mjs` matches DESIGN.md §2.
