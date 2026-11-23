# Build Plan

Order matters: **content first, 3D second.** The site must be shippable (beautiful, bilingual, fast) before any WebGL exists, so the 3D can never block launch.

Each phase ends with its checks passing and a short note appended to `PROGRESS.md` (what was built, what is TODO, screenshots path).

---

## Stack (decided, don't relitigate)

- Next.js 15 (App Router) + TypeScript, static export where possible, deployed on Vercel
- Tailwind CSS v4 with tokens from `src/styles/tokens.css`
- `next-intl` for VI/EN
- React Three Fiber + drei + three (latest stable), `@react-three/postprocessing` only if under budget
- GSAP + ScrollTrigger (free for all uses now) + Lenis
- zustand for scroll/scene state
- sharp for image processing, `@gltf-transform/cli` for models
- Playwright for screenshot QA, Lighthouse CI for budgets

Pin exact versions in `package.json` after install.

## Phase 0: Setup
- Run `./setup-skills.sh` (or confirm the skills in `06-skills.md` are available).
- Scaffold Next.js, Tailwind, next-intl, tokens, fonts (Playfair Display + Be Vietnam Pro, `vietnamese` subset, `display: swap`, preload the hero weight only).
- Move all copy from `02-content.md` into `src/content/vi.json` and `en.json`.
- **Check:** diacritics test string renders correctly in both fonts at 16 px and 96 px (screenshot it).

## Phase 1: The static site (no 3D)
- All routes and all home sections H0 to H8, fully styled, responsive (375, 768, 1280, 1920).
- Hero shows a Still-tier poster where the 3D will go (use an ArtCraft lookdev frame or a soft gradient placeholder).
- Nav pill, language toggle, footer, contact mailto, SEO metadata (OG image, `lang` attributes, hreflang), sitemap, robots.
- Image pipeline + consent flag.
- **Check:** Lighthouse mobile ≥ 95 on all four categories. Playwright screenshots of every route at 375 and 1440 saved to `qa/phase1/`. No text overflow in Vietnamese (Vietnamese runs ~15 to 25% longer than English in places).

## Phase 2: Motion infrastructure + supporting motion
- Lenis + ScrollTrigger wiring, `useMotionTier`, reduced-motion handling.
- Fixed canvas shell with scene switching and `frameloop="demand"`, using placeholder primitives (sphere / plane / cone) for the three scenes.
- Line reveals, photo parallax, logo draw-on, hover states.
- **Check:** 10 s Chrome performance trace of a full scroll: no long tasks over 50 ms, no frame over 33 ms. Scrolling with trackpad, mouse wheel, keyboard (Space/PageDown) and touch (device emulation) all feel continuous.

## Phase 3: Animation 3, the lotus (simplest geometry, proves the pipeline)
- `blender/scripts/lotus.py` → bake → GLB → optimize → wire to the pillars section.
- **Check:** budget met; petals open in sync with cards; the final crossfade to the 2D logo lotus lines up (screenshot at progress 0.9, 0.95, 1.0).

## Phase 4: Animation 1, the seed (hero)
- `seed.py` → GLB with sprout clip. Idle bob + pointer parallax. Thread handoff at the top of frame.
- **Check:** LCP still under 2.5 s (canvas must not delay the headline). Hero GLB ≤ 600 KB.

## Phase 5: Animation 2, thread to brocade to product
- Weave shader, instanced threads, procedural products with real brocade texture (or TODO(products) neutral texture), drape clip.
- **Check:** budget met; brocade pattern not stretched on any product (screenshot each product at its hero angle).

## Phase 6: Fallback tiers
- Render Lite-tier scrub videos and Still-tier posters from the Blender scenes.
- **Check:** force each tier via `?tier=full|lite|still` and screenshot; throttled "Low-tier mobile" run in DevTools stays smooth.

## Phase 7: QA and launch prep
- Accessibility: keyboard order, focus rings, alt text (VI + EN), canvas `aria-hidden`, all info available without 3D.
- Lighthouse CI budgets from `03-motion-and-3d.md` §7.
- Cross-browser: Chrome, Safari (iOS + macOS), Firefox, Samsung Internet (common in Vietnam).
- Vercel preview deploy. Write `HANDOFF.md`: how GIEO edits copy (the JSON files), adds a collection, swaps photos.
- **Check:** every item in `00-open-questions.md` is either answered or listed in `HANDOFF.md` as an open TODO.
