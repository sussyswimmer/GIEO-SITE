# blender/

Rebuild the lotus: `npm run models` (needs Blender 5.2; set `$BLENDER` to override the path).

- `scripts/common.py` reads colours from `src/styles/tokens.css`, mixes and linearises them, and exports GLB.
- `scripts/lotus.py` builds the lotus (17 pivoted petals, stem, pod, seed) and self-checks the contract.
- `scripts/build-models.mjs` runs it, then meshopt-compresses to `public/models/lotus.glb`.
- `scripts/seed.py` builds Animation 1 (the seed: mound, two hinged halves, morphing stem and thread, two leaves) and bakes the 10 s `Sprout` animation at 24 fps. No modifiers, because the animated export needs `export_apply=False`.
- `renders/seed/` eight lookdev PNGs, q000 to q100. `scenes/seed.blend` is its lookdev scene.
- `out/` raw GLB (gitignored). `scenes/lotus.blend` lookdev scene.
- `renders/lotus/` five lookdev PNGs: closed, p1, p123, bloom, finale.
- `scripts/weave.py` builds Animation 2 (Threads ribbons, a 29x29 cloth `Panel` with 8 drape shape keys, the tote, mug and coaster on a `Carousel` of three stations) and writes `out/weave-cloth.png`, a flat 64x64 tone. No modifiers and no glTF animation: the runtime writes morph weights and the empties. Its self-checks fail the build on a mirrored or stretched UV (Panel, MugBand, CoasterTop), a triangle budget over 16,000, or an open or inward-wound solid. `build-models.mjs` converts the PNG to `public/models/weave-cloth.webp` with sharp (lossless, no upscale).
- `renders/weave/` eight lookdev PNGs (warps, weave, drape050, tote, tote_front, mug_a, mug_b, coaster). The printed surfaces carry a circle-and-F chart in lookdev only; it is never shipped. Judge colour in the browser, not here.
- `film/art.py` renders the page art, two stills on transparent: `tote` (the weave film's stylised bag and plain weave, lit and framed by `film/stills.py`; no page loads it since `docs/09-feedback.md`, where the real products are photographs) and `roots` (the seam under the hero film: the seed film's earth in section, crumbling away, with pale roots). Rebuild both, render and encode: `node scripts/render-film.mjs --scenes art` (about a minute). It writes `public/art/products/tote.webp` (long edge 1600, at most 180 KB) with `-800` versions, and `public/art/seam/roots.webp` (2400 x 900, at most 220 KB) with `roots-1200.webp`; masters go to `D:/claude-scratch/gieo/film/raw/art/`, contact sheets to `.../sheets/art-products.png` and `art-roots.png`. `art` is never part of `npm run film`.
- `roots.webp` is made to straddle the seam: the hero film's bottom edge crosses it at 16 % of its height (`ART.roots.seam` in `scripts/encode-film.mjs`; anywhere from 13 to 19 % stays behind solid earth, and the encoder fails if it does not). Above that line its crumbs thin out over the film's own soil; below it is plum. It has no vanishing point and nothing centred, so it can be cropped left and right at any point.
- Pass absolute paths to `--render`/`--blend` when running Blender by hand from Git Bash: a relative path resolves against the drive root.
