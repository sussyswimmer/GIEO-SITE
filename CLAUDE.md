# GIEO Website: Claude Code Brief

You are building the official website for **GIEO (Girls' Initiative for Education and Opportunities)**, a student-led social initiative from Hanoi that turns traditional brocade weaving into modern products with partner Chie Dù Pù Dù Pà, and reinvests in H'mong women artisans and their daughters through three pillars: Economic Empowerment, Education, and a Mentorship Network. "Gieo" means "to sow".

The products today are the **Nối Nếp** collection, made with Chie Dù Pù Dù Pà: the **Nối Bag** (a brocade handbag) and the **Nếp Keychain** (a lipstick holder). GIEO makes nothing else today: the two other products this site once showed are gone (`docs/09-feedback.md` F2). GIEO's own copy says H'mong throughout; their product leaflet says the patterns come from the weaving of the Thái people in Chiềng Châu, Mai Châu. That is an open question (`docs/00-open-questions.md` #13): leave GIEO's sentences exactly as they wrote them, and name no ethnic group in anything new about the products.

The site must feel premium and alive: **three signature 3D scroll animations**, soft and editorial in look, and a scroll that is **fluid from top to bottom with nothing blocking the reader**.

## Read these first, in order

1. `docs/01-brand.md`: identity facts, logo, color tokens, type, voice, **ethics guardrails**
2. `docs/02-content.md`: site map and all copy (VI + EN, verbatim from GIEO)
3. `docs/03-motion-and-3d.md`: scroll rules, the three animations, fallback tiers, perf budget
4. `docs/04-asset-pipeline.md`: Blender (primary 3D), ArtCraft (lookdev/backdrops), After Effects (optional Lottie)
5. `docs/05-build-plan.md`: stack and phases with checks
6. `docs/06-skills.md`: which skills to load per phase
7. `docs/00-open-questions.md`: things GIEO still has to answer (use placeholders, never block)
8. `docs/07-redesign.md`, `docs/08-fuller.md`, `docs/09-feedback.md`: the later briefs, in that order. Each one overrides the files above, and the briefs before it, wherever they disagree. `09` is GIEO's first feedback (November 2026): smaller type, the real products, real photographs.

## Non-negotiables

1. **Scroll is never blocked.** No scroll-jacking, no snap, no pins longer than 150vh, no full-screen preloader, no cookie/donate/newsletter bars or popups. Lenis on wheel only; phones keep native touch scroll.
2. **One fixed WebGL canvas** for all three scenes, `frameloop="demand"`. Copy is always HTML.
3. **Budgets are hard limits** (`03-motion-and-3d.md` §7). Cut detail before you cut smoothness.
4. **Three fallback tiers** (Full / Lite video scrub / Still) via one `useMotionTier` hook. `prefers-reduced-motion` always respected.
5. **Bilingual VI + EN** from day one; all strings in `src/content/*.json`. Vietnamese diacritics must render perfectly.
6. **Never invent facts.** No statistics, testimonials, team members, prices or pattern meanings that GIEO hasn't given. Use `TODO(tag)` placeholders that render nothing in production.
7. **Minors' privacy.** A real GIEO photo may be used only when no person in it can be recognised; hands and a back view are fine. No face of a child or a teenager, ever, without GIEO's consent for that photo, and the team are minors too. Every photo needs a `yes` row in `assets/consent.csv` (a missing row counts as no) and an entry in `assets/photos/SOURCES.md`; only photos marked `consent: true` render. Alt text says what is visible and nothing else: no place, no ethnic group, no "our artisans". Never pair a child's face with her name or village. Strip EXIF. (`docs/09-feedback.md` F3.)
8. **Logo is never redrawn or retyped.** Use GIEO's file.
9. **Every 3D scene is built by a re-runnable Blender Python script** in `blender/scripts/`. No orphan hand-made assets.
10. Ask Maxwell before anything with side effects outside this repo: deploying to production, buying a domain, installing global tools, emailing GIEO.

## How to work

- Follow the phases in `05-build-plan.md`. Finish each phase's **Check** before starting the next, then append a short entry to `PROGRESS.md` with screenshot paths.
- Look at your own output: run the dev server and take Playwright screenshots (375 px and 1440 px) after every visual change. For 3D, screenshot at scroll progress 0, 0.25, 0.5, 0.75, 1.0 of each scene.
- Review walks and QA scripts run against a production build (`npm run build`, then `npx next start -p 3101`). The dev server returns 404 for files added to `public/` after it started. A worker's report says which build is on the port.
- Judge transparent renders composited on the page's token colours (`src/styles/tokens.css`), on a field larger than the canvas. Never on black.
- Tasks that need a GUI tool (ArtCraft, After Effects UI): write precise job instructions in `artcraft/jobs.md` or `ae/README.md`, tell Maxwell, and carry on with something else.
- If the Blender MCP is available, use it for visual iteration; otherwise run Blender headless (`blender -b -P script.py`).
- When unsure between two looks, pick the calmer one. This brand whispers; it doesn't shout.

## Quick facts for components

- Email: gieovietnam2026@gmail.com · Instagram: @gieo.vietnam · Facebook: facebook.com/gieo.vietnam
- Supported by: IB Global Youth Action Fund (text mention only unless GIEO approves the logo)
- Product partner: Chie Dù Pù Dù Pà (founded 2011)
- Products: the Nối Nếp collection. Nối Bag / Túi Nối (brocade handbag, id `bag`) and Nếp Keychain / Móc Nếp (lipstick holder, id `lipstick`). The names come from GIEO's printed leaflet and are DRAFT until GIEO confirms them for the web. No prices, no wallets, and none of the products `docs/09-feedback.md` F2 removed.
- Photos: thirteen real frames in `assets/photos/`, listed in `assets/consent.csv` and `assets/photos/SOURCES.md`; `npm run images` writes them to `public/img/`. They are looked up by id (`src/lib/photos-manifest.json`), not by file-name prefix.
- Signature line from GIEO: "This is GIEO, so far."
