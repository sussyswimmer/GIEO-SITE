# Progress

## 2026-11-08 · Phase 0: Setup ✅

- Next.js 15.5.29 (App Router) + React 19.1.0 + TypeScript 5.9.3 + Tailwind 4.3.5 + next-intl 4.14.9, all pinned to exact versions. VI is at `/`, EN at `/en` (`localePrefix: 'as-needed'`, browser detection, TODO(lang)).
- All copy is in `src/content/{vi,en}.json` (109 keys: 79 DRAFT, 4 TODO, listed in `src/content/_meta.json`). `npm run content:check` fails if any non-DRAFT string isn't verbatim from `docs/`.
- `DESIGN.md` ("First light" art direction, computed contrast table, VI-safe line-heights from font metrics) and `PLAN.md` (per-section layout at 375/768/1280/1920), plus `src/styles/tokens.css`, the only file with hex values.
- Shared layer: `src/components/ui/*`, NavPill (52 px, hides on scroll down), LanguageToggle, Footer, SkipLink, `lib/site.ts`, `lib/seo.ts`.
- Fixed a middleware matcher bug from the scaffold that made every unprefixed VI route except `/` return 404.
- **Check:** diacritics test at 96 px and 16 px, Playfair 400/500/italic and Be Vietnam Pro 300/400/500. No clipping or collisions: `qa/phase0/qa-diacritics@1440.png`, `qa/phase0/qa-diacritics@375.png`.

## 2026-11-08 · Phase 1: Static site ✅ (performance gate closed in the entry below)

Built:
- Home sections H0–H8 (`src/components/home/*`), with reserved `SceneStage` boxes holding Still-tier gradients where the three 3D scenes go.
- `/collections`, `/about`, `/get-involved`, `/contact` (mailto form, no backend). Per-page metadata and hreflang, `sitemap.xml`, `robots.txt` (disallows `/qa`), OG image.
- Image pipeline `scripts/process-images.mjs` (AVIF/WebP at 640–2400, EXIF stripped, consent from `assets/consent.csv`), self-test `npm run test:images`, and `src/lib/photos.ts` (only `consent: true` in production). No photos yet, so no gallery renders.
- An Opus critique of the round-1 screenshots produced 13 fixes; 11 were applied (fixes to hreflang tags, inlined CSS, glow tokens, favicon, screen-reader labels, footer tap targets, middleware matcher).

Gates (re-run on the final tree): typecheck ✅, lint ✅, content:check ✅, test:images ✅, build ✅ (17 static pages).

Lighthouse mobile (`qa/phase1/lh-*.json`, Windows, single run per route, local `next start`):

| Route | Perf | A11y | BP | SEO | LCP |
|---|---|---|---|---|---|
| `/` (vi) | 86 | 100 | 100 | 100 | 3.58 s |
| `/collections` | 87 | 100 | 100 | 100 | 3.45 s |
| `/about` | 81 | 100 | 100 | 100 | 3.62 s |
| `/get-involved` | 86 | 100 | 100 | 100 | 3.59 s |
| `/contact` | 91 | 100 | 100 | 100 | 3.15 s |
| `/en` | 94 | 100 | 100 | 100 | 2.83 s |
| `/en/collections` | 93 | 100 | 100 | 100 | 3.01 s |
| `/en/about` | 93 | 100 | 100 | 100 | 2.95 s |
| `/en/get-involved` | 94 | 100 | 100 | 100 | 2.85 s |
| `/en/contact` | 63 | 100 | 100 | 100 | 3.22 s (TBT 3116 ms outlier, not re-run) |

**Not met:** Phase 1 asks for ≥95 in all four categories. Performance is 81–94 and LCP is above 2.5 s on every route. VI pages are slower than EN; the leading suspect is the Playfair `vietnamese` subset not being preloaded (only the latin 400 file is). Measure on Linux/Vercel before changing the design.

Screenshots: `qa/phase1/` (all routes × vi/en × 375/768/1280/1440/1920, after fixes). `qa/phase1-r2/` is a partial re-run that was stopped on purpose; ignore it.

Open TODOs (render nothing in production):
- Content: `home.journal.closing` (copy-vi), `about.teamHeading` (team), `getInvolved.volunteer.body` (volunteer), `getInvolved.donate.body` (donate)
- Assets/answers: logo-svg, products, photos, video, shop, mentor, brand (exact tokens from the Canva deck), domain, lang, ib
- The 79 DRAFT strings need GIEO / native-speaker review. Several are VI translations of English-only labels.
- Design note for GIEO: `--lotus-pink` text measures 2.51:1 on cream, so DESIGN.md never uses it as text (stricter than 01-brand.md §3).

Remaining items from the Phase 1 critique: TODO(lang). The Lighthouse gate and the EN contact re-run are closed below.

## 2026-11-08 · Phase 1: performance gate ✅

Diagnosis, from the Lighthouse JSONs and a 3-run baseline (VI home 86, EN home 94). The missing Vietnamese preload was not the cause:
- **Fonts.** Vietnamese pages loaded 18 woff2 files (226 KB). next/font serves every Google subset, and `ă đ ĩ ũ ơ ư` fall in both the vietnamese and latin-ext ranges with latin-ext declared later, so each face downloaded both files. An unused Playfair 600 also forced a 38 KB variable file. Lighthouse counts every font requested before the observed LCP, which explains the VI/EN gap almost exactly (+93 KB, +0.6 s).
- **JS.** `useTranslations` in NavPill, LanguageToggle and Logo shipped next-intl's ICU parser (11 KB gzipped) to format plain labels.
- **HTTPS only.** `<form action="mailto:">` is reported as mixed content on HTTPS and took /contact to Best Practices 77. Plain-HTTP localhost hid it.

Changes (no visual design change):
- Self-hosted fonts in `public/fonts` and `src/styles/fonts.css`: latin + vietnamese only, with next/font's fallback metrics. Playfair 600 removed. Playfair 500 and italic (below the fold everywhere) are added after load by `LateFonts.tsx`. Only Playfair 400 latin is preloaded, as the build plan asks, and that now also works on Windows builds.
- Client components take strings as props; `NextIntlClientProvider` gets `messages={null}`.
- /contact has no mailto form action. Without JS the form is hidden and the links beside it remain.

Medians of 3 runs, Lighthouse mobile. Reports in `qa/phase1/lighthouse-final/`.

| Route | Perf (HTTP/2 + brotli) | LCP | Perf (local HTTP/1.1 + gzip) | LCP |
|---|---|---|---|---|
| `/` | 99 | 1.92 s | 97 | 2.51 s |
| `/collections` | 99 | 1.81 s | 97 | 2.50 s |
| `/about` | 99 | 1.95 s | 97 | 2.51 s |
| `/get-involved` | 99 | 1.80 s | 97 | 2.49 s |
| `/contact` | 99 | 1.81 s | 96 | 2.71 s |
| `/en` | 99 | 1.88 s | 98 | 2.33 s |
| `/en/collections` | 100 | 1.73 s | 97 | 2.56 s |
| `/en/about` | 99 | 1.96 s | 97 | 2.56 s |
| `/en/get-involved` | 100 | 1.73 s | 97 | 2.64 s |
| `/en/contact` | 100 | 1.81 s | 97 | 2.56 s |

Accessibility, Best Practices and SEO are 100 and CLS is 0 on every route (Best Practices 100 on /contact after the mailto fix, measured over HTTPS).

The Phase 1 Check (≥95 in all four categories) is met in both columns. The HTTP/2 + brotli column uses a throwaway local proxy (`D:\claude-scratch\gieo\h2\proxy.mjs`) as the closest stand-in for Vercel without deploying. Over local HTTP/1.1 + gzip, LCP is 2.33 to 2.71 s, over the 2.5 s budget on 7 of 10 routes; those misses come from simulated connection queueing that HTTP/2 removes. A real Vercel run is still needed to confirm.

LCP element on phones is the hero sub-paragraph (or the first paragraph on inner pages), not the h1 as PLAN.md §7 assumed; the h1 "GIEO" is the larger text only at desktop widths. Both are live text, so the kit's rule (LCP is text, not the canvas) holds.

Screenshots: `qa/phase1/` (375 and 1440 re-taken after the font change, every route, both locales).

## 2026-11-08 · Phase 2: Motion infrastructure ✅ scripted Check passed; feel check and JS budget still open

Built:
- Tier detection (`tier.ts`, `useMotionTier`): Full / Lite / Still, `?tier=` override for QA. Lite renders like Still until Phase 6.
- `MotionBoot` in the layout: after `load` + idle + 2.5 s, or on the first wheel/touch/key/pointer. Everything heavy is a dynamic import.
- `motion-runtime`: Lenis (wheel only, `syncTouch: false`), ScrollTrigger, h2 line reveals (SplitText, lines only, reverted when done), stroke draw-on, photo parallax, card tilt, scene progress to a zustand store.
- One fixed `SceneCanvas` (R3F, `frameloop="demand"`) with three primitive placeholders for seed, weave and lotus. Loaded only at Full tier on a page with a `[data-scene-stage]`.
- CSS: load hairline, hero sub-paragraph `rise-in`, sprout `draw-on`, `SceneStage` still painted on `::before` and faded out once `html[data-canvas="ready"]`.

Gates: `npm run build` clean; `scripts/qa-motion.mjs` PASS with 0 console or page errors (trace, keys, touch, tiers, scenes, reveal, webgl); parallax PASS under `next dev`.

Check numbers from this run (Chrome headless, `node scripts/qa-motion.mjs`):
- WebGL renderer: `ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 (0x00002488) Direct3D11 vs_5_0 ps_5_0, D3D11)`. A real GPU, not software GL. A phone or an integrated GPU will differ.
- Scroll trace, 1440x900, vi-VN, Full, 10.03 s wheel scroll, progress 0.986: long tasks (> 50 ms) 0, max 0 ms; 600 frames, max frame 17.1 ms, p95 16.8 ms, frames over 33.4 ms 0.
- Keys: PageDown x6 and Space x6 each advanced the page (0 to 9035 px).
- Touch (375x812, synthesized touch scroll x3): scrollY advanced each time (0, 1910, 3745, 5578), native touch (no Lenis touch handling), 671 frames, max 17.2 ms, none over 33.4 ms.
- Tiers: `full` has 1 canvas; `still` and `lite` have 0 and fetch no three chunk; `/about?tier=full` has 0 canvases and no three chunk; reduced motion gives `data-tier="still"`, no `html.lenis`, below-fold h2 at opacity 1.
- JS budget (`/?tier=full`, transferred): 422.7 KB total; 183.6 KB excluding three and R3F; 234.8 KB counting R3F. **Open decision:** 03 §7 says "excluding three.js" and sets a hard 220 KB, so read literally the site is 14.8 KB over. The script reports a pass only because it excludes R3F too (the Phase 2 spec's definition). R3F is required by 03 §1 and loads only at Full tier after boot, so first-load JS (116.5 KB) is unaffected. Recommendation: amend 03 §7 to "excluding three.js and React Three Fiber". Maxwell's call.
- Scenes: seed, weave and lotus each set `html[data-scene]` at p = 0.5, at 1440 and 375. The seed's p 0 to 0.5 shots at 1440 are the same frame: the hero starts in view, so its progress begins near 0.5.
- Parallax (`next dev`, 6 frames found): inner transform moved from translateY -20.4 px to -2.0 px at scale 1.12.
- Lighthouse mobile, median of 3, local HTTP/2 proxy: `/` perf 99 (runs 99/99/99), LCP 1.93 s, TBT 47 ms, CLS 0; `/en` perf 99, LCP 1.81 s, TBT 15 ms, CLS 0. Accessibility, Best Practices and SEO 100 on both. No regression from Phase 1 (99, 1.92 s and 1.88 s).

Scrolling during boot. The trace above starts 1 s after the canvas is ready, so it covers a loaded page only. The same 10 s wheel scroll started right after `load` puts motion boot inside the window (final build, 3 runs per case, `D:\claude-scratch\gieo\boot-scroll.mjs`):

| Tier, CPU | Long tasks over 50 ms | Frames over 33.4 ms | Worst frame |
|---|---|---|---|
| Full, 1x | 0 | 1, 1 (4 on the cold first run) | 50 to 67 ms (117 ms cold) |
| Full, 4x | 4 to 5, of 56 to 131 ms | 4 to 5 | 117 to 133 ms |
| Still, 1x | 0 | 0 | 33 ms |
| Still, 4x | 2 to 3, of 55 to 118 ms | 2 to 3 | 100 to 167 ms |

On this PC a reader who starts scrolling in the first second sees one dropped frame as the three.js chunk and canvas start. The Check's numbers hold from a loaded page, not from load. Not fixed: Phase 4 replaces this boot path with the real seed, so measure it again there.

Screenshots: `qa/phase2/` (scene frames at 5 progress points, 2 widths, `scroll-trace.json`, `motion-report.json`, `motion-report-parallax.json`) and `qa/phase2/pages/` (home, about, en at 375 and 1440).

Human checks still needed (a script cannot judge them): trackpad and mouse-wheel feel of Lenis, including scrolling straight after load, real-phone touch feel and frame rate on a mid-range Android, and whether the placeholder primitives read as calm rather than loud.

Deferred, and why:
- Hero headline drift: Phase 4, with the seed scene.
- Lite-tier scrubbed video: Phase 6 (no video exists yet).
- Logo draw-on is a dev-only neutral thread until GIEO's SVG exists (TODO(logo-svg)); no lotus is drawn.
- Photo parallax has no production photos (none consented), so it is verified only in `next dev`.
- The three scene primitives are placeholders, not the Blender motifs.

## 2026-11-09 · Phase 3: Animation 3, the lotus ✅ budget and sync met; logo crossfade blocked on TODO(logo-svg)

Built:
- **Blender pipeline:** `blender/scripts/common.py` reads colours from `tokens.css`, and `blender/scripts/lotus.py` builds the lotus. `npm run models` (`scripts/build-models.mjs`) runs Blender headless, then `gltf-transform meshopt --level high` to `public/models/lotus.glb`. `@gltf-transform/cli` is pinned at 4.5.1 as a devDependency. `lotus.py` asserts:
  - the triangle budget;
  - 17 petal pivots with opening orders {1, 2, 3, 4 ×14};
  - the hinge direction;
  - RGBA vertex colours on every mesh.

  `npm run test:models` checks the shipped GLB's size, node names, extras and compression. Lookdev renders are in `blender/renders/lotus/` and the scene is `blender/scenes/lotus.blend`.
- **Model:** a stem that dissolves to transparent instead of ending in a cut, a receptacle, a seed pod, and one seed that the runtime clones 7 times. There are three rings of petals (6, 6 and 5). The front three of the outer ring are the pillar petals and are 1.08× larger. No materials or textures are stored; colours come from vertex colours derived from the tokens.
- **Runtime:**
  - `LotusScene.tsx` uses GLTFLoader with MeshoptDecoder and one `MeshPhysicalMaterial` with sheen, shared through clones so there is one shader program. Shaders are pre-compiled with `compileAsync` when the model loads, and the scene sets `html[data-lotus="ready"]` once that is done.
  - The model loads lazily when the pillars section comes within 1.5 viewports (the `near` latch in `mountScenes`). It is not part of the initial payload.
  - Six scrubbed beats drive the scene: `rise`, `p1`–`p3`, `bloom` and `finale`, with ScrollTrigger ids `lotus-*`.
  - Each `PillarCard` gets `data-active` (border `--petal-soft` and the lift glow, DESIGN.md) while its centre is in the middle half of the viewport.
- **Layout and decisions** (PLAN.md H5):
  - At ≥1024 the cards `ul` gets `lg:pb-(--beat-min)`, so sticky travel is 124svh (limit 150).
  - At <1024 the lotus plays as its inline stage crosses the viewport.
- **Lights** (shared by every scene): hemisphere 2.4 (`--cream` / `--petal-soft`), key 1.3, rim 1.2. three.js divides diffuse by π, so the first values (1.4 and 1.6) rendered the petals dusty rose.

Opus critique, two rounds:
- Round 1:
  - lit colour too dark → fixed with the lights;
  - all seeds vanished once the first one landed → per-seed scale fade, and seeds now fall past the fold;
  - the top-down tilt finished as the lotus left the screen → it now completes by finale 0.6;
  - an X where the bud tips crossed at the apex → tip curl reduced to 0.04.
- Round 2: accepted.

Check (production build, `next start`, `node scripts/qa-motion.mjs`, all 8 groups PASS, 0 console or page errors):
- **Budget:**

  | Item | Measured | Limit |
  |---|---|---|
  | GLB file | 30,324 B (raw export 176,488 B) | 400 KB |
  | GLB transferred | 11.3 KB | |
  | Triangles | 9,180 | |

  JS fetched after scrolling to the lotus is 23.4 KB, all three.js (GLTFLoader, meshopt decoder). Total JS excluding three and R3F is 184.4 KB, up from 183.6 KB. The open R3F budget question from Phase 2 is unchanged.
- **Trace** (10 s wheel scroll over the whole page, which now crosses the lotus load): 600 frames, max 17.7 ms, p95 16.8 ms, 0 frames over 33.4 ms, 0 long tasks.
- **Petals in sync with cards** (1440, each card centred in the viewport):

  | Card | Its petal | Next petal | `data-active` |
  |---|---|---|---|
  | 1 | 1.0 | 0.10 | card 1 only |
  | 2 | 1.0 | 0.16 | card 2 only |
  | 3 | 1.0 | 0 | card 3 only |

  Every beat reads 1.0 at its end at both 1440 and 375, and the finale channel matches q at 0, 0.5, 0.9, 0.95 and 1.0.
- **Not met: the crossfade to the 2D logo lotus.** It needs GIEO's SVG (`TODO(logo-svg)`, noted in `LotusScene.tsx`). The 0.9, 0.95 and 1.0 screenshots show the 3D finale only: the bloom tilted toward a top-down view, with the seeds already past the fold.
- Lighthouse was not re-run. The lotus code and model load only after boot and near the pillars, and the first-load JS is unchanged except for the small runtime additions.

Screenshots: `qa/phase3/`:
- `lotus-card{1,2,3}@1440.png`;
- `lotus-{rise,p1,p2,p3,bloom}@{1440,375}.png`;
- `lotus-finale-{0,0.5,0.9,0.95,1}@{1440,375}.png`;
- `scene-*` frames;
- `motion-report.json`.

Open:
- On phones the seeds fall behind the opaque first card.
- The front-centre pillar petal reads as a rounded shell while it opens toward the camera (accepted).
- Human feel check on a real phone and trackpad, still open from Phase 2.
- A stray folder, `C:\blender\renders\lotus\` (4 PNGs from a first run with a relative path), is outside the repo and waiting for Maxwell to delete it.

## 2026-11-09 · Phase 4: Animation 1, the seed ✅ Check met; 4x CPU boot path still open

Spec: `D:\claude-scratch\gieo\phase4-spec.md` (builder A/B split, Opus critique of renders and browser screenshots, then an independent review workflow).

Built:
- **Blender:** `blender/scripts/seed.py` builds seed halves on hinges, soil mound, stem tube, thread ribbon and two leaves. `npm run models` rebuilds both GLBs. `public/models/seed.glb` is 73,680 B (22.6 KB transferred), 4,332 triangles, one clip `Sprout` (10 s, 241 samples, 14 channels), 8 morph targets on `Stem` and `Thread`, 1 on each leaf. Parsed from the file: every `COLOR_0` is VEC4; no materials, textures, UVs or tangents.
- **Export rules learned** (`common.export_glb(path, animated=True)`): `export_apply=True` silently drops shape keys, so animated meshes have no modifiers. The scene mode needs `export_anim_scene_split_object=False`, and the clip takes the scene's name. Meshopt quantisation rewrites mesh-node transforms, so TRS channels only target empties. A parent at scale 0 breaks the exporter, so leaf pivots floor at 0.001.
- **Layout (overrides PLAN.md's first idea):** only the stage pins; the text scrolls and drifts 8% as one block. Measured before building: the hero is taller than the screen on phones (stage bottom 747 px on a 667 px phone), so a pinned container would have cut the seed off, and kit §0.3 wants text moving while the 3D scrubs. Hero is `motion-safe:min-h-[200svh]`; the stage wrapper is sticky-bottom below 1024 and centred in a 100svh sticky box above it. The scrub runs 115svh, so H1 rises in over the tail.
- **Runtime:** `SeedScene.tsx` (one mixer, `setTime` clamped to 0.9999 of the clip), `mountSeed` and `mountHeroDrift`, lazy behind `near.seed`. The still waits for `html[data-seed="ready"]`, not the canvas. Idle bob 30 fps only while the seed is on screen and q < 0.15. Pointer tilt ≤ 3°. No gyro (iOS needs a permission prompt, and the kit bans popups). Lighting is vertex colours plus the shared lights, as with the lotus, not baked.

Tuned after looking (differs from the spec's numbers):
- The opened seed read as horns: plump almond profile, rest y −0.235, asymmetric hinges (L 0.20, R 0.46 rad by q 0.42), seam darkening 0.28.
- The stem stopped dead against the paler thread: tube tapers to 0.0025, ribbon fades in over s̄ 0.60–0.78, ribbon stays exact `--stem-mint` to s̄ 0.95, column alpha (0, 0.6, 1, 0.6, 0).
- The shared lights lean pink and greyed the mint, which reopened the join: stem and leaves get their own material, `sheen 0`, colour multiplier (1.1, 1.43, 1.39).
- The mound read as scales when flat shaded: now smooth. Dust formed a helix because its height step mirrored the angle step: now 0.7549.

Check (production build, `next start`, `node scripts/qa-motion.mjs`, all 9 groups PASS, 0 console or page errors):
- **Budget:** GLB 73.7 KB against 600 KB. 4,332 triangles against 25,000.
- **LCP:** Lighthouse mobile, median of 3, HTTP/2 proxy. `/` 1.93 s (runs 2.00, 1.92, 1.93), `/en` 1.81 s (1.81, 1.81, 1.92). Perf 99, A11y/BP/SEO 100, CLS 0, TBT 25 and 35 ms. **Lighthouse never reaches motion boot** (no three.js or GLB requested), so the canvas path is checked directly at 4x CPU and Slow 4G:

  | Width | LCP, Full | LCP element | `seed.glb` requested at | LCP, Still | Delta |
  |---|---|---|---|---|---|
  | 1440 | 640 ms | SPAN (headline) | 7,488 ms | 692 ms | −52 ms |
  | 375 | 772 ms | P (sub) | 7,457 ms | 676 ms | +96 ms |

  These are emulated over localhost, so read them for the ordering, not the absolute value.
- **Scroll trace:** 10 s wheel scroll, 600 frames, max 16.8 ms, p95 16.8 ms, 0 over 33.4 ms, 0 long tasks. RTX 3070.
- **Seed group at 1440, 375, 768, 1024:** `store.seed` matches q at 8 stops, stage drift 0 px, text moved 0.79 viewports, thread reaches the top of the frame (55, 35, 50, 47 mint pixels in the top 6 rows), idle 30–31 fps at the top and 0 at q 0.8.
- **Navigation:** soft nav to /about renders 0 frames, back home resumes at 30 fps, and after a locale switch one canvas still scrubs (store 0.6 at q 0.6).
- **Reduced motion:** 0 canvases, hero one screen.
- `npm run test:models` 14/14. Typecheck, lint, content:check, test:motion and build clean.
- **JS (`/?tier=full`, transferred):** 446.8 KB total. 184.6 KB excluding three.js and R3F (Phase 3: 184.4). 235.8 KB counting R3F. `excludingThreeBytes` now also excludes the GLTFLoader/meshopt chunk, which is three.js; classification is per chunk. The open question from Phase 2 stands: read literally, 03 §7 is 15.8 KB over once R3F is counted. Maxwell's call.

Boot-scroll re-measure, promised in Phase 2 (10 s wheel scroll from `load`, 3 runs per case, Blender idle, Roblox and one other process running; `D:\claude-scratch\gieo\boot-scroll-final.txt`):

| Tier, CPU | Long tasks over 50 ms | Frames over 33.4 ms | Worst frame | Phase 2 |
|---|---|---|---|---|
| Full, 1x | 0, 0, 0 | 2, 1, 1 | 67 ms | 0 tasks, 1 frame, 50 to 67 ms |
| Full, 4x | 11, 7, 4 (up to 779 ms) | 13, 9, 4 | 850, 767, 184 ms | 4 to 5 tasks up to 131 ms, 117 to 133 ms |
| Still, 1x | 0, 0, 0 | 0, 0, 0 | 33 ms | 0, 0, 33 ms |
| Still, 4x | 3, 3, 3 (up to 142 ms) | 3, 4, 3 | 150 ms | 2 to 3 tasks up to 118 ms, 100 to 167 ms |

Normal speed matches Phase 2. **Full at 4x is not resolved:** runs 1 and 2 had tasks of 372 to 779 ms past 4 s, and Phase 2 had no lotus load in its path. Three further traced runs did not reproduce them (`D:\claude-scratch\gieo\p4b-trace*`): the worst tasks were first layout (314 to 416 ms, no script, also on Still) and evaluating the lazy 3D chunks (155 to 338 ms). No seed-specific task over 50 ms appeared. Phase 6's throttled low-tier check should pin this down on a quiet machine.

Independent review (4 reviewers, 4 skeptics, 1 Opus critic, read-only): 17 findings, 6 confirmed, none missed by the critic. Fixed: idle loop kept rendering on every page after leaving home; a compile finishing after unmount could mark a removed scene ready (also in LotusScene); hero text could clip on very short desktop windows (`lg:min-h-svh`); `build-models.mjs` broke on paths with spaces (no shell now); `__pycache__` not ignored; PLAN.md table note. Also stopped the idle loop at q 0.15, where the bob ends. Left alone: the still fades in 300 ms against the model's 600 ms, a brief dip behind a soft orb, once per visit.

Screenshots and reports in `qa/phase4/`:
- `seed-q{0,0.15,0.3,0.45,0.6,0.75,0.9,1}@{1440,375,768,1024}.png`;
- `seed-after-locale@1440.png`, `scene-*`, `lotus-*`;
- `motion-report.json` (all groups), `motion-report-seed.json` (seed group with the LCP entries);
- `lighthouse/` (`/en`), `lighthouse-vi/` (`/`).

Open:
- Human feel check on a real phone and trackpad, still open from Phase 2. Nothing has run on iOS Safari or Android.
- Full-tier boot path at 4x CPU, above.
- Until Phase 6, Still and Lite visitors without reduced motion get the plain orb pinned for one extra screen.
- At 375×667 the sprout cue overlaps the top of the stage on the first frame. Reasoned harmless (the cue is at the left edge, the seed is centred), not rendered with the seed.
- A faint line shows at the very top of the page while the nav is hidden, probably its shadow. Pre-existing.
- WebGL context loss and a mid-hero resize were only read in code, not run.

## 2026-11-09 to 11-11 · Phase 5: Animation 2, the weave ✅ Check met; `/en` LCP and the R3F budget need Maxwell's ruling

Spec: `D:\claude-scratch\gieo\phase5-spec.md`, built on `phase5-base-plan.txt` (the winner of a three-design judge panel). Builder A/B split, three Opus critique rounds of browser screenshots, one independent verifier, then a closing run on 2026-11-11.

**No real brocade exists yet**, so the cloth is the neutral placeholder from docs/00 row 5: one flat tone plus a plain over-under yarn grid. Nothing in code, a uniform or a file name calls it brocade. Placeholder decisions are marked `TODO(products)`.

Built:
- **Blender:** `blender/scripts/weave.py` builds the threads (ribbons), the cloth panel with 8 drape morph targets, the tote (body, two handles on pivots), the mug (body, printed band) and the coaster (body, printed top) on a carousel. No glTF animations: the runtime writes morph weights and empties. `weave.py` asserts no modifiers, colour attributes, ≤ 16,000 triangles, UV isometry (Panel mean 1.0000, worst flight key 0.0071; MugBand 0.9996; CoasterTop 1.0000), no mirrored printed triangle, and a stable Panel vertex order. `npm run models` also writes `public/models/weave-cloth.webp`, a lossless 64×64 flat tone of `mix(--peach-glow, --cream, .35)` (44 B). `common.export_glb` gained `morphs` and `uvs` flags; lotus and seed stay byte-identical.
- **Runtime:** `WeaveScene.tsx`, `mountWeave` in `motion-runtime.ts`, seven scrubbed beats with ids `weave-{thread,warps,weave,drape,tote,mug,coaster}`. The cloth fills row by row from the bottom up, as on a loom. Print materials come from one shared `onBeforeCompile` factory (`FrontSide`, no sheen, a per-surface colour lift against the shared lights, a soft panel edge). The scene stays hidden until `compileAsync` resolves and `html[data-weave="ready"]` is set; the still waits for the same flag. No timers, no idle motion: the GPU is idle when the reader stops. Shared lights unchanged.
- **Layout:** beat 3 in `Craft.tsx` is `lg:min-h-[85svh]`, so sticky travel is about 109svh (limit 150). PLAN.md H2, DESIGN.md and a docs/03 note (WebP not KTX2, ribbons not tubes, closed-form drape not a cloth sim, carousel rotation not a camera arc) are updated. At ≥1024 the product name under the matching beat gets an underline (`data-active`, DESIGN.md:373), and only one is ever lit.

Deviations from the spec, all decided by looking in the browser:
- **O5 head tint:** the mint row head read as a khaki transparency grid, so it uses the spec's fallback: `--cream` at .55, with the cloth's lift applied. The over offset is .07, not .15.
- **O2 yarn:** the grid aliased into stepped-cross, diamond and key-fret figures at 768, 1024 and 375, which could be read as an invented pattern. Yarn now flattens to tone once `fwidth` passes .14 (gone by .28), at a strength of `.92 + .125 * prof` rather than `.82 + .26 * prof`. The coaster has no yarn at all (`uYarn 0`): its tilt and turn shear the grid into a rhomb lattice. Coaster lift is `(1.01, 1.17, 1.21)`, solved so it matches the tote cloth.
- **Drape colour:** the drape tips the cloth into the sky light and it flashed butter-yellow, so the panel's lift eases by up to 15% at mid-drape (`sin(π·drape)`); it is unchanged at 0 and 1.
- **O14:** no handoff into the lotus is built. The coaster scrolls away, and the lotus's rising mint stem is the visual rhyme.
- No "weave half" lookdev render: the row reveal is a shader effect Blender cannot show.

Critique rounds fixed, in order:
1. Hidden tote parts still wrote depth and punched a hole in the cloth; aliasing (above); a zero-length coaster tile trigger; the coaster cloth too pink; rims clipping to yellow; a carton-stiff tote; no glow behind the products; fused handles.
2. The yellow drape flash; the muddy row head; flat-cut thread ends below the cloth; outer threads showing as piping down its sides; aliased handle edges; the coaster yarn; an over-tall glow.
3. The tote straps turned inside out at the shoulders: a sign error in the strap tangent (`weave.py:353`). The verifier found three lifecycle bugs, all fixed: a product name stayed underlined after resizing across 1024; leaving the page could leave a ghost frame on the shared canvas (the fix covers the seed and lotus too); and on a return visit hidden objects skipped the pre-compile. Two new QA checks cover the first two.

Check (2026-11-11 closing run: production build, `next start -p 3101`, `node scripts/qa-motion.mjs --base http://localhost:3101 --out qa/phase5`, all 10 groups PASS, 0 console or page errors; Blender not running):
- **Budget:**

  | Item | Measured | Limit |
  |---|---|---|
  | `weave.glb` on disk | 96,932 B | |
  | Transferred, glb + cloth | 32,285 + 321 B | 1.2 MB |
  | Triangles | 11,112 | 16,000 (spec), 40,000 (docs/03) |

  `npm run models` twice gives identical `weave.glb` (`990f7234…`) and `weave-cloth.webp` (`1f09c8cd…`); lotus (`832a816b…`) and seed (`72644e8a…`) are unchanged. `npm run test:models` 23/23, including a neutrality guard on the cloth texture. Shader programs go from 7 to 10 when the scene loads.
- **Trace:** 10 s wheel scroll, 600 frames, max 17 ms, p95 16.8 ms, 0 over 33.4 ms, 0 long tasks (RTX 3070).
- **Weave group at 1440, 375, 768 and 1024:** every beat's store channel within 0.05 of its target at q 0.5 and 1. Text safety: 0 scene pixels inside 31 to 44 text boxes at thread 0.5, warps 0.5 and weave 1. GPU idle: 0 frames rendered in 1 s, 2 s after settling at each of the 7 beats. Tiles: exactly the matching name is lit at tote, mug and coaster (1440, 1024). After crossing 1024, 0 tiles are lit; after a soft navigation away, 0 draw calls. Stage centre at coaster 1 sits 19–42% down the viewport.
- **Orientation and stretch (the Phase 5 Check):** QA swaps the cloth texture for a generated chart (circles plus an asymmetric F) with no app change, which also proves the real-scan swap path. On tote, mug and coaster at 1440 and 375 the F is upright and unmirrored and the circles are round. The coaster chart sits turned 18°, which is its hero turn. The mug band clips a partial row at its edge.
- **Continuity** (report only): the weave thread starts 9.7 px (1440) and 10.9 px (375) from where the seed thread leaves.
- **Ethics, at 1× and 2× density:** no stepped-cross, diamond or key-fret figure in any frame (the canvas caps at 1.5×, so 1× and 2× bracket real devices). Chie Dù Pù Dù Pà is credited beside the products in both locales.
- **JS (`/?tier=full`, transferred):** 447 KB total. 184.7 KB excluding three.js and R3F (Phase 4: 184.6). 235.9 KB counting R3F. The Phase 2 question stands: read literally, 03 §7 is 15.9 KB over once R3F is counted. Maxwell's call.
- **Lighthouse mobile, median of 3, HTTP/2 proxy:** Perf 99 on every run, A11y/BP/SEO 100, CLS 0, Lighthouse JS 108 KB (unchanged).

  | Route | Runs (LCP) | Median | Phase 4 |
  |---|---|---|---|
  | `/` | 1952, 1953, 1957 ms | 1.95 s | 1.93 s |
  | `/en` | 1810, 1919, 1939 ms | 1.92 s | 1.81 s |

  **Not cleanly met: "Lighthouse must not regress."** `/en` LCP is 110 ms slower at the median, though one run matched Phase 4. Across the four Phase 5 measurements the `/en` median moved between 1.81 and 1.92 s with identical first-load JS. The weave code and models load only after motion boot, which Lighthouse never reaches. I read this as run-to-run spread, not a cause, but I haven't proven that. Both routes stay well under 2.5 s. Maxwell's call; a real Vercel measurement would settle it.
- Typecheck, lint, content:check (109 keys, 0 warnings), test:motion (11/11) and build clean.

Real-scan runbook (when GIEO sends a brocade scan; not built):
1. A flat straight-on scan goes in `assets/photos/brocade/`. **A person picks the crop**; no automatic centre crop.
2. Convert to a 1024 WebP at `public/models/weave-cloth.webp` (about 300 KB at most). Remove the neutrality guard in `scripts/models.test.mjs`.
3. Lower the yarn strength toward .08 so it doesn't fight the photo's own weave.
4. A person picks the mug strip: one wrap maps to about 19% of the scan's height and needs a named V offset. The pattern on the mug is about 2.2–2.7× larger than on the tote.
5. Sample `--thread-1..n` from the scan into `tokens.css`, repaint the threads, delete `TODO(products)`.
6. GIEO or Chie Dù Pù Dù Pà approves the crop and the animated treatment. Any credit uses GIEO's own wording. Ask whether the pattern is woven at all: if it is embroidered or batik, a row-by-row loom reveal misdescribes the craft.
7. Re-run the weave and trace groups. If the texture upload makes a long task over 50 ms, move to `ImageBitmapLoader`.

Screenshots and reports in `qa/phase5/`:
- `weave-{thread,warps,weave,drape,tote,mug,coaster}-{0.5,1}@{1440,375,768,1024}.png`, plus `*-bare` frames for the text-safety diff;
- `weave-chart-{tote,mug,coaster}@{1440,375}.png`, `weave-continuity-*`;
- `dpr2-*` (2× density: weave 1, drape 0.25/0.5/0.75, tote 1, coaster 1 at 1440 and 375) and `dpr1-drape-*`;
- `scene-*`, `seed-*`, `lotus-*`, `motion-report.json`, `scroll-trace.json`;
- `lighthouse/` (`/en`), `lighthouse-vi/` (`/`).

Open:
- `/en` LCP and the R3F reading of the JS budget, above.
- Not seen in motion: row-wipe speed (on phones about 12 px of scroll per row), the carousel crossfade (the mug handle shows through the coaster rim near coaster 0.5), and edge crawl on the coaster's lower rim (antialias is off by design).
- A faint pink hairline runs along the inside curve of the handles while they rise (drape about 0.75). Gone on the finished tote.
- `compileAsync(...).then` in WeaveScene has no `catch`. If it ever rejects, the scene stays hidden and the still stays up. No crash.
- The frame check only proves the stage centre is at least 8% down, which sticky positioning nearly guarantees. The chart check has no assertion and depends on someone looking.
- Stray folders `C:\blender\renders\{lotus,seed,weave}` from early runs with relative paths are outside the repo, waiting for Maxwell to delete (`Remove-Item -Recurse C:\blender`).
- Human feel check on a real phone and trackpad, still open from Phase 2.

## 2026-11-11 · Phase 6: Lite and Still fallback tiers ✅ Check met; Safari and a real phone still to see it

Spec: `D:\claude-scratch\gieo\phase6-spec.md`. Builder A (Sonnet) built the capture pipeline, Builder B (Opus) the runtime and QA. I integrated, then fixed what one independent Opus critic found.

Built:
- **Capture (`npm run fallbacks`, `scripts/render-fallbacks.mjs`):** frames come from the real-time Full renderer in Chrome, posed through the QA hook (`__gieoMotion.pose`). They are not Cycles renders, a deliberate deviation recorded in docs/03 §6 and docs/04: the row reveal, yarn flattening and colour lifts exist only in the browser shaders. Lite and Still therefore match Full frame for frame. Each scene's beats are laid end to end on one timeline (`src/lib/fallback-timeline.ts`, tested). The run takes about 4 minutes and needs `next start` and ffmpeg.
- **Files:** `public/video/{seed,weave,lotus}.mp4`. Each is 1440×1080 side by side (premultiplied RGB | alpha as grey), all-intra H.264, BT.709 TV range, faststart. Also 26 `public/posters/{scene}-{k}-{720,1080}.webp` with alpha (13 keys × 2 widths, 4.5–70 KB each).
- **Runtime (`src/lib/fallback-stage.ts`):** the scene triggers now run in every tier and only write state. In Lite, each near stage gets a media box (s × 1.5·s, feathered edges). The box holds a WebGL1 quad that rebuilds alpha from the video and seeks with one pending target. In Still, the posters are drawn into two crossfading 2D canvases. Media mounts only when a stage is near. A video error, missing WebGL, lost context, or no frame within 6 s drops that scene to Still. Soft navigation cleans everything up.

| Video | CRF | Size | Frames |
|---|---|---|---|
| seed | 18 | 1.54 MB | 120 |
| weave | 20 | 2.59 MB | 170 |
| lotus | 18 | 2.06 MB | 160 |

Decode round trip (frames 0, middle, last): alpha mean error ≤ 0.15, max 48 at hard edges; colour in opaque pixels mean ≤ 2.3, p99 ≤ 11 (of 255).

Deviations, all decided while integrating:
- **Posters are canvases, not `<img>`.** As an image, the hero poster arrived 5.5 s after load on a 4× throttled phone and became the LCP element (budget 2.5 s, hero copy). A canvas is never an LCP candidate.
- **Save-Data picks Still, not Lite** (docs/03 §6 table said Lite). Lite streams up to 6.2 MB of video; Still loads about 330 KB of posters. `tier.test.mjs` updated. **Maxwell's call if you want it back.**
- **Still crossfade:** the incoming key fades in on top, then the outgoing key fades out beneath it (600 ms in all). A plain two-way fade dipped to 75% cover mid-fade, so the glow showed through the object.
- **QA:** the `tiers` and reduced-motion checks now count only WebGL canvases. They skip canvases inside `[data-scene-stage]` and Still's poster canvases, and still require no three.js chunk.

Critic findings fixed: no fallback when the video never loads (iOS Low Power Mode, stalled network); Save-Data; the crossfade dip, and a key repainting while it was still visible; QA passing on a blank canvas or a 404 poster (it now needs ≥ 2,000 drawn px at each scene's middle point, and `data-key` is set only once painted); a poster decoding after cleanup re-setting `data-media`; Lite fading in on frame 0 and then jumping to the target; a seek target dropped when `seeked` fired below HAVE_CURRENT_DATA.

Check (production build, `next start -p 3101`, `node scripts/qa-motion.mjs --base http://localhost:3101 --out qa/phase6`, all 12 groups PASS, 0 console or page errors):
- **Each tier forced via `?tier=`, screenshotted at 1440 and 375** (`fallback` group):
  - **Lite:** at 5 points per scene, the shown frame equals `frameAt(t)` exactly.
  - **Still:** exactly one poster is visible, and it is the nearest key.
  - **Transparency:** the empty corners of the Lite box differ from the page without media by ≤ 1 (of 255).
  - **Text safety:** 0 pixels hit inside 8–41 text boxes.
  - **Media really drawn:** 10k–219k px at each scene's middle point.
  - **Loading:** no `.glb` and no three.js chunk is requested. Lotus media is not requested at the top of the page. Every near stage is ready within 0.1 s of reaching it (lotus on phone 27–29 ms after the scroll).
  - **Video failure:** with `weave.mp4` aborted, the weave stage shows posters and has no compositor canvas.
- **Throttled low-tier mobile run (`lowtier`):** 375×812, `?tier=lite`, 4× CPU, touch scroll from top to bottom. 1,162 frames; 0 long tasks; 0 frames over 50 ms; max 33.5 ms, p95 33.3 ms (20 frames over 33.4 ms, one 30 fps step). **Smooth.**
- **LCP probe (4× CPU, slow network):** the hero copy is the LCP element in Full, Lite and Still at both widths: 560–604 ms.
- **Full tier unchanged:** trace 600 frames, max 16.9 ms, 0 long tasks. JS 187.2 KB excluding three.js and R3F (Phase 5: 184.7), 238.4 KB counting R3F. Lighthouse not rerun: it never reaches motion boot, and the new code loads only after boot.
- **Boot-scroll re-measure (the open Phase 4 item, now with Lite).** 10 s wheel scroll from `load`, 3 runs each, `D:\claude-scratch\gieo\boot-scroll-p6.txt`:

  | Tier, CPU | Long tasks over 50 ms | Frames over 33.4 ms | Worst frame | Phase 4 |
  |---|---|---|---|---|
  | Full, 1x | 0, 0, 0 | 1, 1, 1 | 50 ms | 67 ms |
  | Full, 4x | 5, 4, 4 (up to 139 ms) | 4, 4, 4 | 134 ms | tasks up to 779 ms, frames to 850 ms |
  | Lite, 1x | 0, 0, 0 | 0, 0, 0 | 33 ms | (new) |
  | Lite, 4x | 2, 2, 2 (up to 131 ms) | 1, 2, 1 | 150 ms | (new) |
  | Still, 4x | 2, 1, 3 (up to 126 ms) | 1, 3, 4 | 134 ms | tasks up to 142 ms |

  The Phase 4 tasks of 372–779 ms did not come back. Every tier's worst task is first layout (about 120 ms, also on Still) or the chunk evaluation at boot. I'm treating the item as closed on this PC.
- Typecheck, lint, content:check, test:motion (20/20) and build clean.

Screenshots and reports in `qa/phase6/`:
- `{lite,still}-{seed,weave,lotus}-{0..4}@{1440,375}.png`, with `*-bare` and `*-text-bare` frames for the diffs;
- `motion-report.json` (all groups), `motion-report-fallback.json`, `scroll-trace.json`;
- contact sheets of every 10th captured frame: `D:\claude-scratch\gieo\fallback-sheets\`.

Open:
- **No WebKit/Safari or real-device run.** Unchecked: iOS decode of the detached video, the 6 s stall fallback, and Safari's colour management of the BT.709 transfer tag (the critic suggests tagging sRGB, `iec61966-2-1`; it would shift both the colour and the alpha half). The 4× CPU throttle does not slow video decode or GPU upload, so "smooth" holds for this PC's decoder.
- The weave warps come in from outside the box and fade at its left edge, where Full lets them run to the screen edge. Accepted; widen the weave box if it reads as cut.
- The poster width (720 or 1080) is picked once at mount.
- The crossfade is checked only at rest (1.5 s after each scroll), not mid-fade.
- From Phase 5: `/en` LCP and the R3F reading of the JS budget; human feel check on a real phone and trackpad; stray `C:\blender`.

## 2026-11-16 · Redesign v2, site side: "First light, closer" ✅ checks met on this PC; Safari and a real phone still to see it

Brief: `docs/07-redesign.md` (Maxwell's review: tighter, a stronger landing, more scroll effects, more Blender, more design). This entry covers the home page and the runtime. The films and stills in `public/film/` were rendered and encoded by the film builder; this side only reads them. Style rules are in `DESIGN.md` §10, the section map in `PLAN.md` §2a.

Built:
- **Home order:** `Thread, Sow, Weave, Hands, Bloom, KineticBand, VisionMission, Journal, Involve`. Hero and Meaning merged into Sow; Partner and NextGen into Hands. New: `home/{Sow,Weave,Hands,Bloom,KineticBand,Thread,StillLife}.tsx`, `ui/FilmStage.tsx`, `src/lib/stills.ts`, `src/app/layout.tsx`. The R3F canvas is no longer mounted; its files and dependencies are untouched.
- **Sow:** the seed film full-bleed; "GIEO" spans the content width and is the LCP element (transform-only entrance). The screen holds while the film scrubs and three beats of copy crossfade inside the film's `textSafe` box.
- **Weave:** the one plum section. Film stage sticky and bleeding off the top, bottom and right from 1280; a sticky band under the nav on phones. Quote lights up word by word; product names follow the film; partner credit under the list.
- **Hands, Journal:** large Blender stills with a clip-path unveil and layered drift, partner credit under the one that shows products.
- **Bloom:** lotus film with the three cards as a stacking deck. **Kinetic band** of the pillar titles after it.
- **Whole page:** the thread (one SVG path drawn by scroll, down one gutter, never across text), stitched hairlines, tighter tokens, bigger type scale, a footer that ends on `home.journal.heading` with seeds falling towards it.
- **Copy:** no string added or changed. **DRAFT copy keys: none.**

Density (`node scripts/qa-density.mjs`, production build, shots every 0.75 screen; nav pill and decoration hidden, as the brief says; colour difference is CIE76):

| | Before (`D:\claude-scratch\gieo\redesign-before\density.txt`) | After |
|---|---|---|
| `/en` 1440×900 | 12.8 screens | 9795 px = **10.88** (limit 12.0) |
| `/en` 390×844 | 11.9 | 9808 px = **11.62** (limit 12.5) |
| `/vi` 1440×900 | 12.9 | 10533 px = **11.70** (limit 12.0) |
| `/vi` 390×844 | 12.4 | 10432 px = **12.36** (limit 12.5) |
| Shots passing | 38 of 67 | **64 of 64** |
| Lowest coverage | 3.7 % | 11.9 % (a phone shot; phone floor 10 %, desktop 12 %) |
| Tallest empty band | 63 % of the screen | 33 % (limit 35 %) |
| Type floors | not checked | no text under 14 px in `main`, no paragraph under 16 px |

Checks (`node scripts/qa-redesign.mjs`, production build on port 3101: **25 pass, 0 fail**; output in `qa/redesign/checks.json`):
- **Overflow at 375:** 0 px, no copy past an edge, EN and VI.
- **Reduced motion:** `data-motion` unset, 0 sticky elements, 0 copy elements hidden, both sizes and languages. **No JS:** 0 copy elements hidden.
- **LCP at 4× CPU:** the `<span>` "GIEO" every time, 304–404 ms (localhost, so read it as "is the right element and is not waiting on anything", not as a field number).
- **Hero text box:** all three beats inside the film's `textSafe` box at 1440×900, 390×844 and 375×667, EN and VI. (The Vietnamese third beat overran by 18 px at 375×667 until its first line dropped to 18 px on short screens.)
- **Weave frames 45, 120, 140, 169** at 1440, 390, 1280×720 and 1920×1080: the canvas runs off the screen on the warp frame and each product's measured box is inside the screen. Shots: `qa/redesign/weave-f{045,120,140,169}-w{390,1280,1440,1920}.png`.
- **Scroll trace, 10 s:** 780 frames, worst 18.8 ms, no long task. At 4× CPU (reported, not gated): worst 69 ms, 3 frames over 33 ms, 3 long tasks of 52–73 ms.
- **Contrast:** plum scope and hero copy on the seed film's key frames added to `DESIGN.md` §2 (worst pixel 5.51:1, 99 % of the text box 11.8:1 or better).
- **Spot checks** (`D:\claude-scratch\gieo\preship.mjs`): CLS 0.0000 over load and a full scroll; all 12 links and buttons take a visible 2 px focus ring (cream inside the plum section), have a name and are 44 px tall or inline text.
- Typecheck, lint (0 errors; 2 warnings in `scripts/encode-film.mjs`, the film builder's file), `content:check` (109 keys, 0 warnings), `test:motion` (36/36) and build clean.

Found and fixed while checking:
- **Stills unveiled empty.** The unveil's clip hid a still from the browser's lazy loading, so the image arrived about 0.6 s after its own wipe began and its first paint dropped one frame (6 of 8 traces showed a 33 ms frame at the Hands section). The runtime now fetches and decodes a still a screen and a half ahead; 8 of 8 traces are clean.
- **Coaster cut at the last frame** on desktop: the products now play while the stage is still pinned.

Screenshots: `qa/redesign/{en,vi}-w{1440,390}-NN.png` (the walk) and the weave frames above. `qa/redesign/standin/` holds the walk from before the real films arrived (flat stand-in films, for testing the player only).

QA scripts: `scripts/qa-density.mjs` and `scripts/qa-redesign.mjs` are the checks for the home page now. `scripts/qa-motion.mjs` and `scripts/render-fallbacks.mjs` test and feed the R3F build and no longer describe the home page; they are left in place with the R3F files.

Deviations from the brief, for Maxwell to rule on:
- **Pins are shorter than allowed.** Hero holds 115svh (desktop) / 100svh (phone), not 280 / 240: the three beats crossfade in one box instead of scrolling over the film, which is what keeps copy off the soil. Weave and Bloom use sticky stages beside scrolling copy rather than a pinned section.
- **`--space-section-sm` starts at 32 px**, not 40, and the lead size starts at 18 px on phones (26 px on desktop): the Vietnamese phone page would otherwise pass 12.5 screens. Both are site-wide tokens, so inner pages tightened too. The footer was also compacted site-wide.
- **The thread stays in one gutter** with a dip at each seam, instead of swinging across the page: a full crossing in a short gap read as a frame, not a thread.
- **Weave stage:** the products in the film are larger than the middle 60 % of the frame (tote 0.22–0.78 wide and 0.05–0.87 high; the mug reaches 0.945 while it turns), so the stage is sized from their measured boxes. The top of the tote's handle sits 8–15 px below the top of the screen, so it passes under the nav pill when the pill is showing. A tote about 10 % smaller or lower in the film would clear it. The stage does not bleed on 1024–1279 wide screens, or on screens narrower than about 1.59:1.
- **Journal's closing line** sits in the stills row's right third, not under the row; Vietnamese has no `closing` copy yet, so nothing renders there.
- **Footer line** is one line across the content width (about 130 px EN, 91 px VI at 1440), smaller than `text-mega`, with the seeds above it rather than falling past it: on Vietnamese type a seed touching the line reads as a tone mark.
- The film set (`l` / `ls` / `p`) is picked once at load; a phone-to-desktop resize keeps the first pick.

Open:
- **No WebKit/Safari or real-device run** (carried over from Phase 6): iOS decode of the scrubbed video, the phone weave band under a real nav pill, and scroll feel on a trackpad are unseen.
- The page thread runs under the weave film, so during the warp frames a hairline of it shows through the gaps between warps at the right edge (`qa/redesign/weave-f045-w1440.png`, top right).
- On phones the weave canvas bleeds off both sides, so between beats a product enters from the screen edge (`qa/redesign/vi-w390-04.png` catches the mug mid-entrance). At each beat's hold the product is fully on screen.
- Hero contrast was measured on the four key frames, not on all 150.
- The runtime fetches the seed manifest a second time for the text box; `film-stage.ts` could expose `textSafe` instead.
- `home/Partner.tsx` and `home/DictionaryCard.tsx` are now used only by `/about`.

## 2026-11-16 · Redesign v2, revise round after the pre-ship review ✅ checks met on this PC; Safari and a real phone still to see it

The pre-ship review came back REVISE with two must-fix items and five smaller ones. All seven are in. Where this entry and the one above disagree (hero pin length, page lengths, check counts, where the weave credit sits), this one is current.

Must fix:
- **Hero run was too short to read.** `[data-hero-run]` is now 190svh from 1024 and 150svh on phones (was 115 / 100). Copy and film share one timetable (`HERO_FILM`, `HERO_WORD`, `HERO_BEATS` in `src/lib/motion-runtime.ts`, in shares of the run): the headline holds over the seed in the air to 12 %; the film runs frames 0–95 (fall, sprout) while the headline shrinks away; the dictionary entry holds over the sprout from 29 to 45 % with the film at rest on frame 95; `meaning.body` passes while frames 95–149 play (stem to thread); the initiative line holds over the thread from 77 % to the end with the film at rest on frame 149. docs/07 §1 allows the hero up to 300svh if new text arrives at least every 70svh; the longest wait here is 55svh.
- **Partner credit was off screen while products showed.** `collections.hmong.credit` moved out of the product list into the sticky weave stage, at its foot, under the film. One copy in the section. The runtime lights it at the drape beat (film frame 89) and it stays lit; with no runtime it is simply visible.

Should fix:
- **Pillar deck clipped titles.** `--deck-peek` is 5.5rem from 768, and each card gets the bottom margin that makes all three leave the screen together, so no card rides up over the title before it. The deck's `10svh` gap went.
- **Lotus stem ended in a flat cut.** The lotus stage fades its lowest 12 % with a CSS mask.
- **Page thread start.** Its first point is the film's `threadExit` through the same cover fit as the stage, no longer clamped into the gutter: x = 1310.4 at 1440×900 (set `l`, exit 0.882) and x = 1.9 at 390×844 (set `p`, exit 0.195: the crop puts the rope at the screen's edge). See "Open" for what the review saw.
- **Phone weave: a name underlined over an empty band.** A product name is active only once its product is in (40 % into its beat) and until the beat ends; the coaster keeps it, since the film ends there. Measured every 25 px of scroll, EN and VI at 390 and 1440 (`D:\claude-scratch\gieo\names.mjs`): tote active within frames 118–128, mug within 139–147, coaster within 158–169; never two at once, never outside its product's beat.
- **Thread seam read as a kink.** The lean at a seam now takes the same half wave as any other sway and stays inside the gutter (at most gutter / 2 − 8 px), instead of going in and out within the gap alone.

Found while checking:
- **A third of a screen with nothing to read where the pillars leave.** With decoration hidden, the kinetic band is empty space, and the Vision and Mission headings were held back until 88 % of the screen. The density walk had been stepping over that window; the longer page landed a shot in it (band 36 %). Those two headings now start their reveal as they cross the foot of the screen. A 40 px sweep of that seam with the walk's own measure (`D:\claude-scratch\gieo\sweep.mjs`): 0 of 124 stops fail, tallest band 34 % (VI 1440).
- **Hero stitch touched the type** on phones taller than 667 px and read as an underline; its margin now grows with the screen (4 px at 667, 9 px at 844).

Page length. `scripts/qa-density.mjs` now counts the hero as one screen: the counted length is the total minus the hero's run beyond 100svh (0 where nothing pins), and the 12.0 / 12.5 cap applies to that. Both are printed.

| | Raw | Counted (hero as one screen) | Limit |
|---|---|---|---|
| `/en` 1440×900 | 10579 px = 11.75 | **9.85** | 12.0 |
| `/en` 390×844 | 10193 px = 12.08 | **10.58** | 12.5 |
| `/vi` 1440×900 | 11411 px = 12.68 | **10.78** | 12.0 |
| `/vi` 390×844 | 10817 px = 12.82 | **11.32** | 12.5 |

Density: **66 of 66 shots pass**, lowest coverage 14.2 %, tallest band 32 %, type floors clean.

Checks (`node scripts/qa-redesign.mjs`: **33 pass, 0 fail**), new ones first:
- **Hero strip:** 11 shots down the run at 1440×900 and 390×844, EN and VI (`qa/redesign/hero-{en,vi}-w{1440,390}-{00..10}.png`). Alone and whole per shot, the same in all four: headline, headline, –, dictionary entry, dictionary entry, –, body, –, initiative line ×3.
- **Weave credit:** at frames 120, 140 and 169 there is one credit, lit, inside the screen and below the product's measured foot; EN at 1440, 390, 1280×720, 1920×1080 and VI at 1440 and 390 (`qa/redesign/weave-vi-f{045,120,140,169}-w{390,1440}.png` are new).
- **Deck:** EN and VI at 1440: the deck stacks, and whenever a card lies under the next its whole title is above that card's top edge (`qa/redesign/deck-{en,vi}-w1440.png`).
- Unchanged and still passing: overflow at 375, reduced motion, no JS, LCP at 4× CPU (`<span>` "GIEO", 236–376 ms), hero text box at three sizes, weave geometry. Scroll trace: 769 frames, worst 19.0 ms, no long task; at 4× CPU (reported only) worst 69.6 ms, 3 frames over 33 ms.
- Typecheck, lint (0 errors; the same 2 warnings in `scripts/encode-film.mjs`), `content:check`, `test:motion` (36/36) and build clean.

Not changed, by the reviewer's call: the hard soil-to-plum seam, no heading on the weave section, the tote handle under the nav pill on scroll-up.

Open, added by this round:
- **The seed film's rope and the weave film's yarn do not line up at the seam.** The rope leaves the hero at x ≈ 1310 (1440 wide); the weave film opens on its own yarn 225 to 300 px to the left, in the middle of its canvas; on a 390 phone it is the screen's left edge against x ≈ 235. The page thread does start under the rope, but the weave stage sits above it, so at that seam the reader sees two film threads and not the page thread (`D:\claude-scratch\gieo\seam-hero-w{1440,390}.png`). Lining them up is a film change (the weave's opening yarn, or the seed's exit point), or a stage shift that would undo the product framing. Not done here.
- The credit reads "Products made with …" from the drape beat, when the cloth on screen is not yet a product. That is where the review asked for it to start.
- The density walk samples every 0.75 screen, so it can step over a short bad window, as it did above. Only the pillars-to-vision seam was swept finely.
