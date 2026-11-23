# Motion and 3D Spec

The brief from the client: strong 3D motion, exactly **three signature animations**, and a scroll that feels fluid from top to bottom. No big blocking bars, nothing clunky.

The three animations are one continuous story: **a seed is sown → its stem becomes the thread that weaves the brocade → the brocade's future blooms as the lotus of three pillars.** Each one hands off to the next, so the page reads as one shot, not three demos.

---

## 0. Scroll feel rules (these beat any visual idea)

1. **Native scroll is king.** Use Lenis for wheel smoothing only (`duration: 1.1`, `smoothWheel: true`, `syncTouch: false` so phones keep native momentum). Never disable scroll, never `overflow: hidden` the body after load.
2. **No scroll-jacking.** No snap scrolling, no horizontal scroll hijack, no "wheel = next slide".
3. **Pins are short.** A pinned section may hold for at most **150vh** of scroll. Text keeps moving while the 3D scrubs, so the user never feels stuck.
4. **No blocking bars or overlays.** No full-screen preloader (if anything, a 2 px lotus-pink progress hairline at the very top for under 1.2 s). No cookie banner (use cookieless analytics such as Vercel Analytics or Plausible). No sticky donate bar. No newsletter popup. No "scroll down" pill.
5. **Nav is a small floating pill** (logo + 4 links + language toggle), hides on scroll down, returns on scroll up, never taller than 56 px.
6. **Scrub with damping.** ScrollTrigger `scrub: 0.8` (or lerp the progress yourself at ~0.1 per frame). Animations should glide to catch up, never snap.
7. **Text never waits for 3D.** All copy is HTML, readable, selectable, indexed, and visible even if WebGL fails.
8. **Reduced motion is respected.** `prefers-reduced-motion: reduce` → no scrubbing, no parallax; show the key still frames (captured from the real-time scenes, §6) with 300 ms opacity fades.

## 1. Architecture: one canvas, three scenes

- **One persistent `<Canvas>`** (React Three Fiber), `position: fixed; inset: 0; z-index: 0; pointer-events: none`, behind the HTML content. One WebGL context for the whole page.
- Three scene groups (`SeedScene`, `WeaveScene`, `LotusScene`). A tiny store (zustand) holds `activeScene` and per-scene `progress` (0 to 1) written by ScrollTriggers attached to the HTML sections.
- Only the active scene and the next one are mounted/visible. Crossfade between them over the last 10% / first 10% of each section via a fullscreen fade plane or camera move.
- `frameloop="demand"`: call `invalidate()` on scroll and during tweens, so the GPU idles when the user is reading.
- `dpr={[1, 1.5]}`, `gl={{ antialias: false, powerPreference: 'high-performance' }}`, use SMAA or FXAA in postprocessing only if it costs under 1 ms.
- Assets: `.glb` with meshopt compression and KTX2 textures, loaded via `useGLTF` + `KTX2Loader`. Preload scene N+1 while N is on screen (`useGLTF.preload`).

## 2. Animation 1: "Gieo" (the seed). Hero, 0 to ~120vh

**Story:** gieo = to sow. A single seed is sown and sprouts.

| Scroll | What happens |
|---|---|
| Idle (before scroll) | Cream void, peach glow top-left (`--peach-glow` radial, blurred). One seed (warm brown, matte, soft rim light) floats center-right, bobbing 6 px on a 3 s sine. Mouse/gyro parallax tilts camera max 3°. Headline "GIEO" sits large left. |
| 0 to 30% | Seed drifts down, rotating slowly, and settles into a soft mound of soil (low-poly, stylized, warm taupe). Headline letters drift up 8% slower than scroll (subtle depth). |
| 30 to 60% | Seed splits; a sprout curls out (shape keys baked from Blender), two leaves unfurl in `--stem-mint`. Tiny dust particles (≤ 200 points) lift. |
| 60 to 100% | Stem keeps growing upward and thins into a single glowing green **thread** that exits the top of frame. That thread is the handoff into Animation 2. |

**Pin:** hero pins for 100vh, then releases. Section H1 ("what gieo means") scrolls in over the tail end.

**Build:** Blender model (seed, soil mound, sprout with shape keys or a short armature clip). Export one GLB with the animation clip. Runtime maps `progress → mixer.setTime(progress * clip.duration)`. Lighting baked to textures (see pipeline), runtime uses unlit/basic material + a cheap fresnel rim in a small `onBeforeCompile` patch.

**Budget:** GLB ≤ 600 KB, ≤ 25k triangles total.

## 3. Animation 2: "Thread to brocade to product". Craft section, ~150vh

**Story:** the green thread from the sprout meets other threads and weaves the brocade; the brocade becomes the products that fund the girls' future.

| Scroll | What happens |
|---|---|
| 0 to 25% | The green thread enters from top. 5 to 7 more threads (colors sampled from real brocade photos, `--thread-n`) slide in from the edges. Beat 1 copy scrolls past on the left. |
| 25 to 55% | Threads weave over-under into a square panel; the real brocade pattern reveals across it like a loom filling in, row by row. Pull quote ("Every single thread...") passes. |
| 55 to 100% | The panel drapes onto a **bag**, and the animation ends there. The bag rests while both product names (the Nối Bag and the Nếp Keychain) stand beside the stage in HTML. Beat 3 copy + CTA. |

**Build (cheap and smooth):**
- The weave is **a shader on a plane**, not thousands of thread meshes: brocade texture × procedural over-under weave mask × a row-by-row reveal driven by `uProgress`. Threads entering are 6 to 8 instanced tube meshes that fade out as the shader panel takes over.
- Products are **modeled procedurally in Blender** (clean topology, proper UVs) so the brocade texture maps correctly. AI-generated meshes have messy UVs and will smear the pattern; use ArtCraft for references and lookdev only (see `04-asset-pipeline.md`).
- The drape is a short baked cloth sim clip from Blender (panel → bag) exported as morph targets, or a vertex-shader bend if the sim GLB exceeds budget.

**Budget:** bag + panel ≤ 1.2 MB total, textures 2K KTX2 max, ≤ 40k triangles.

**As built (Phase 5), deviations from the text above:**
- The cloth texture is a WebP (`public/models/weave-cloth.webp`), not KTX2: `toktx` is not installed and a Basis transcoder would cost more bytes than it saves. 1K at most, within the 2K limit.
- The entering threads are camera-facing ribbons in one merged mesh, not instanced tubes: thin tubes stair-step with `antialias: false`.
- The drape is a closed-form pose baked to eight morph targets, not a cloth sim: a sim needs a modifier, and the exporter drops shape keys when it applies modifiers.
- The "camera arcs" are a rotation of a carousel empty about a far axis: the shared camera never moves.

**As built now (`07-redesign.md`, `08-fuller.md`, `09-feedback.md`):** the home page plays this animation as a Blender film scrubbed by scroll (`public/film/weave/`), not as the real-time scene above.
- The film ends on the bag: 130 frames (0 to 129). Beats: thread 0-30, warps 30-50, weave 50-89, drape 89-109, bag 109-129. Key frames: 0, 50, 89, 129. The beat id is `bag`.
- GIEO makes only the bag and the lipstick holder, so the film shows no other product (`09-feedback.md` F2). The bag in the film is the stylised bag it has always had, not a likeness of the Nối Bag (`00-open-questions.md` #19). The real products are shown in photographs.
- The product run rests once: `weaveRun` is one `hold` (54svh on wide screens, 48svh on phones; `scripts/timeline.test.mjs` holds it to at least 45svh on both).
- Both product names stand beside the stage in one list, name large and kind small. They light together when the bag is at least half in. Nothing lights for a product the film does not show.
- `blender/film/weave.py`, `art.py` and `stills.py` build exactly what ships, and `scripts/encode-film.mjs` matches.
- The real-time scene described above is not mounted on any page. It and `public/models/weave.glb` still hold two products GIEO does not make, which nobody can see; that is listed as open in `PROGRESS.md`.

## 4. Animation 3: "The lotus of three". Pillars section, ~150vh

**Story:** GIEO's logo lotus, in 3D. The three front petals are the three pillars. The bloom is the girls' future; the seeds it drops are the next generation (mentorship cycle).

| Scroll | What happens |
|---|---|
| 0 to 15% | A closed lotus bud rises into frame on a slender mint stem, matching the soft 20/10 illustration look (petals `--petal-soft` → `--lotus-pink` at the tips, sheen, gentle backlight glow). |
| 15 to 40% | Petal 1 opens. Pillar card 1 (Economic Empowerment) fades/slides in beside it (HTML). |
| 40 to 65% | Petal 2 opens. Card 2 (Education). |
| 65 to 85% | Petal 3 opens. Card 3 (Mentorship Network). Remaining inner petals open together: full bloom. |
| 85 to 100% | Camera rises to a top-down view; the 3D lotus flattens and crossfades into the **2D line-art lotus from the logo** (SVG stroke, `--blush-line`), then 5 to 9 small seeds drop from the bloom and drift down past the fold toward the Vision/Mission section. Loop closed: sow → weave → bloom → sow again. |

**Build:** petals as separate meshes with pivot at base, each with a rotation driven by its own eased sub-range of `progress` (GSAP timeline scrubbed, `ease: "power2.inOut"`). Material: `MeshPhysicalMaterial` with `sheen`, vertex-color gradient base to tip, no transmission (too expensive). Soft bloom postprocess on petal tips only (selective, low strength) or skip if it costs > 2 ms.

**Budget:** GLB ≤ 400 KB.

## 5. The supporting motion (small, everywhere, cheap)

- Headline reveal: split by line (not by letter, Vietnamese diacritics break letter splits), each line rises 24 px and fades over 700 ms, `cubic-bezier(.16,1,.3,1)`.
- Photo journal: each image parallaxes 6 to 10% inside its frame via `transform` only; images fade+scale from 1.04 to 1.
- Logo lotus draws on (SVG `stroke-dashoffset`) in the nav on first load and in the footer when it enters view.
- Hover: buttons get a soft pink glow and 2 px lift; cards tilt max 4°. No bouncy springs.
- Section backgrounds shift between `--cream` and `--paper` with a slow gradient, never a hard edge.

## 6. Fallback tiers (decide once, at load)

| Tier | Trigger | Experience |
|---|---|---|
| **Full** | WebGL2 OK and first 30 frames average under 22 ms | Real-time R3F scenes as above |
| **Lite** | Low-end signals (`deviceMemory ≤ 4`, `hardwareConcurrency ≤ 4`, slow first frames) or Save-Data on | Same three animations as **scroll-scrubbed videos** rendered from the same Blender scenes (all-intra H.264 so scrubbing is smooth), 720p on mobile, ≤ 3 MB each, lazy-loaded |
| **Still** | No WebGL, reduced motion, or video fails | Key frames as AVIF/WebP posters with fades |

The tier logic lives in one hook (`useMotionTier`) and nothing else in the app branches on device.

**As built (Phase 6).** Lite and Still frames are captured from the real-time Full tier (`scripts/render-fallbacks.mjs`, Chrome at a fixed stage size), not rendered in Cycles. This is a deliberate deviation from "rendered from the same Blender scenes": the row reveal, the yarn flattening and the colour lifts exist only in the browser shaders, and Blender renders misled about colour in Phases 3 to 5, so only a capture makes Lite and Still match Full frame for frame. Each scene's beats are laid end to end on one timeline (`src/lib/fallback-timeline.ts`). Videos are 1440×1080 side by side (premultiplied RGB | alpha) because section glows move behind the stages and an opaque background would show as a box; `src/lib/fallback-stage.ts` composites them in a small WebGL1 canvas inside each stage and falls back to the WebP posters (with alpha) on a video error or no WebGL. Posters only, no AVIF. Posters are drawn into two crossfading 2D canvases, not `<img>`: as an image, the hero poster arrived about 5.5 s after load on a throttled phone and became the LCP element, while the budget below wants the hero copy. Save-Data now picks Still, not Lite as the table says: Lite streams up to 6 MB of video, Still about 330 KB of posters. A Lite scene that shows no frame within 6 s also drops to Still.

## 7. Performance budget (hard limits, checked in CI)

| Metric | Target (mid-range Android on 4G, Lighthouse mobile) |
|---|---|
| LCP | < 2.5 s (hero headline is the LCP element, not the canvas) |
| CLS | < 0.05 |
| INP | < 200 ms |
| JS shipped (gzipped, excluding three.js) | < 220 KB |
| Initial 3D payload before first interaction | Hero GLB only (≤ 600 KB) |
| Total 3D payload for the whole home page | ≤ 2.5 MB |
| Frame time during scroll (Full tier, mid laptop) | ≤ 16.7 ms, no frame over 33 ms in a 10 s scroll trace |
| Lighthouse mobile Performance | ≥ 85 (≥ 95 for Accessibility, Best Practices, SEO) |

If a scene blows the budget, cut detail, not smoothness.
