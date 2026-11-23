# 3D and Motion Asset Pipeline (Blender, ArtCraft, After Effects)

The same source scenes feed the website AND the launch video. Build them once in `blender/`, export twice (real-time GLB for the site, high-quality renders for the video).

```
blender/
  scripts/            Python that builds each scene from scratch (re-runnable, no hand-only steps)
    common.py         palette (from tokens), render settings, bake helpers, GLB export helper
    seed.py           Animation 1 scene
    weave.py          Animation 2 scene for the real-time build (panel, threads, products). No page mounts
                      it now; it still builds two products GIEO does not make, which nobody can see (09-feedback.md F2)
    lotus.py          Animation 3 scene
  film/               Python that builds what ships: the three films, the stills and the art (07-redesign.md §4)
    weave.py          the weave film: 130 frames, thread to cloth to bag, ends on the bag at frame 129
  scenes/             .blend outputs (gitignored if large; keep scripts as source of truth)
  renders/            stills + video plates for fallbacks and the launch video
public/models/        optimized .glb (meshopt + KTX2) used by the site
public/video/         Lite-tier scrub videos
public/posters/       Still-tier key frames
```

---

## 1. Blender (primary 3D tool)

**How Claude Code drives Blender, in order of preference:**
1. **Blender MCP**, if it is configured in this Claude Code session (check `/mcp`). Use it to run Python in the open Blender, screenshot the viewport, and iterate visually.
2. **Headless CLI** otherwise. Windows example:
   `"C:\Program Files\Blender Foundation\Blender 4.x\blender.exe" -b -P blender/scripts/seed.py -- --export public/models/seed.glb`
   (Find the real path with `where blender` or check Program Files. Mac: `/Applications/Blender.app/Contents/MacOS/Blender`.)

**Rules:**
- Every scene is built by a script. If you tweak something by hand in the UI, port it back into the script.
- Units: meters, +Y up on export (glTF default), apply all transforms and modifiers before export.
- Palette: `common.py` reads hex values from `src/styles/tokens.css` so 3D colors always match the site.
- **Bake the lighting.** Light each scene in Cycles (soft area lights, warm key from top-left like the 20/10 post glow, cool fill, back rim), then bake Diffuse + AO (or Combined) to a 2K texture per object. At runtime the site uses cheap unlit materials with the baked texture plus a tiny fresnel rim. This is what makes it look pre-rendered and still run at 60 fps.
- Animation: shape keys or armatures, baked to keyframes. Export the clip with the GLB ("Animation" + "Shape Keys" on, "Sampling" on).
- Triangle and size budgets are in `03-motion-and-3d.md`. Decimate (Collapse, ratio until under budget) after the look is locked.

**Scene notes:**
- `seed.py`: seed = deformed UV sphere with a crease, warm brown gradient. Soil mound = displaced disc, stylized, not realistic dirt. Sprout = curve with bevel + two leaf meshes with shape keys (closed → open). Stem extends to a long thin curve ending in a glowing thread.
- `weave.py` (the film script `blender/film/weave.py`; the legacy `blender/scripts/weave.py` still builds three products for the unmounted R3F scene): one product, a bag (rectangular box + handles via curve bevel, slight cloth sag via short cloth sim baked). UV-unwrap it so a single brocade texture maps without stretching on the woven area. Brocade panel = subdivided plane; drape = cloth sim onto the bag baked to shape keys (≤ 30 frames). GIEO makes no other product the film could show (`09-feedback.md` F2), so the film script `blender/film/weave.py` models only the bag and ends on it. The bag is stylised, not a likeness of the Nối Bag (`00-open-questions.md` #19); the real products are shown in photographs. Do not model the Nếp Keychain or re-model the bag without a reference from GIEO.
- `lotus.py`: 3 rings of petals (outer 3 = pillar petals, slightly larger), each petal a sculpted plane with solidify, origin at base, keyed rotation closed → open. Vertex colors `--petal-soft` at base → `--lotus-pink` at tip. Stem in `--stem-mint`.

**Optimize after export:**
```
npx @gltf-transform/cli optimize in.glb public/models/out.glb --compress meshopt --texture-compress ktx2
```
(Run `npx @gltf-transform/cli optimize --help` first and adjust flags to the installed version.) Then check the result in https://gltf-viewer.donmccurdy.com or a local three.js test page.

**Renders for fallbacks and video:** Cycles (or EEVEE Next if Cycles is too slow), 1920×1080 and 1080×1920, 24 fps, PNG sequences → encode:
```
ffmpeg -framerate 24 -i seed_%04d.png -c:v libx264 -preset veryfast -crf 20 -g 1 -pix_fmt yuv420p -movflags +faststart public/video/seed-720.mp4
```
`-g 1` (all-intra) is what makes scroll-scrubbing a video smooth. Scale to 1280×720 for mobile Lite tier.

> **As built (Phase 6):** the site's Lite videos and Still posters are not Blender renders. `npm run fallbacks` captures them from the real-time Full tier, because the shader-only effects (row reveal, yarn flattening, colour lifts) do not exist in Blender and Cycles misled about colour. Videos are 1440×1080 side by side (premultiplied RGB | alpha), all-intra H.264, one per scene, ≤ 3 MB; see `docs/03` §6. The Cycles path above remains for the launch video.

## 2. ArtCraft (AI 3D/image IDE, human-in-the-loop)

ArtCraft (storytold, getartcraft.com) is a desktop app: 2D canvas + 3D stage, image-to-3D (Hunyuan 3D, Tripo, Meshy, Rodin), 3D compositing, scene blocking, and image-to-video. It is a GUI tool, so Claude Code does not click through it. Instead:

1. Claude Code writes exact jobs into `artcraft/jobs.md` (input file, model, prompt, camera notes, expected output name).
2. Maxwell runs them in ArtCraft and drops outputs into `assets/raw/artcraft/`.
3. Claude Code picks them up, cleans them in Blender (decimate, re-UV, retexture) and wires them in.

**Use ArtCraft for:**
- **Lookdev frames:** stage a rough Blender blockout (export GLB → import to ArtCraft 3D stage) and generate styled stills matching the 20/10 lotus illustration look. These become the visual target for the baked Blender materials.
- **Backdrops:** soft, painterly mountain-terrace mattes for the video and the photo journal transitions (2D, not geometry).
- **Photo animation for the launch video:** image-to-video on consented GIEO photos (subtle motion only: wind in fabric, drifting light, slow push-in).
- **Optional reference meshes:** image-to-3D from a product photo to check proportions. Do NOT ship AI meshes on the site (bad UVs, heavy). Model the real ones in Blender.

**ArtCraft prompt style** (keep consistent across jobs):
`soft 3D illustration, pastel lotus pink and peach, warm cream background, matte airbrushed shading, gentle rim light, airy, editorial, no text, no logos, no people's faces`

## 3. After Effects (2D motion, optional for the site, central for the video)

On the site, AE is optional. Only use it if a 2D animation is clearly better as Lottie than as SVG/CSS:
- Logo lotus line draw-on: do it in SVG stroke animation, no AE needed.
- If GIEO wants an animated brocade pattern loop or illustrated icon set: AE → Bodymovin/Lottie JSON, played with `lottie-web` light build, lazy-loaded, ≤ 60 KB each.

Claude Code can script AE with ExtendScript (`.jsx`): write the script to `ae/`, then Maxwell runs File > Scripts > Run Script File, or on Windows:
`"C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\AfterFX.exe" -r C:\path\to\ae\build_comp.jsx`

## 4. Photos

- Source photos go in `assets/photos/{products,journal,artisans,team,brocade}/`. Today there are thirteen, chosen from the 663 frames GIEO shared in November 2026; `assets/photos/SOURCES.md` lists the album, the original and the crop of each.
- **The rule (`09-feedback.md` F3):** a real GIEO photo may be used when no person in it can be recognised. Hands and a back view are fine. No face of a child or a teenager, ever, without GIEO's consent for that photo; the team are minors too. A frame that fails this does not enter the repo.
- **Every photo needs a row in `assets/consent.csv`**, products and cloth included, not only photos with people. `scripts/process-images.mjs` treats a missing row, or anything other than `yes`, as no.
- `scripts/process-images.mjs` (sharp, `npm run images`) outputs AVIF + WebP at 640/1024/1600/2400 widths into `public/img/`, strips all metadata (location data!), and writes the manifest `src/lib/photos-manifest.json` with dimensions and blur placeholders. A photo without consent gets a manifest entry and no file.
- Every photo entry in the manifest has `consent: true|false`. Components refuse to render `false` in production.
- A photo's id is its path under the collection folder without the extension (`products/bag-rows.jpg` is `bag-rows`). Pages look photos up by that id, not by a file-name prefix. Its alt text is `photos.<id>.alt` in both content files; without it the photo is not shown.
