# Vine hero: design (short)

**Intent (Maxwell, 2026-11-17).** The home page opens on the word GIEO with a vine wrapped around it. Scrolling grows the vine into a tree; the tree drops a single seed; that seed becomes the seed of today's film (falls into the soil, splits, sprouts). Also answers his earlier notes: only GIEO on the first screen (no copy popping up on load), and no "freeze" (every scroll visibly grows something).

**Approach (picked by Maxwell): live 3D.** Considered: a drawn SVG vine (could pass in front of letters, flatter look), live 3D (soft 3D look like the products; always behind the text), a Blender film (best match, needs Blender on the Mac). Live 3D chosen: the vine and tree twine around and behind the word, showing between and around the letters.

**Design**
- One pinned hero, two acts. Act 1 (new, ~140svh of scroll): vine → tree → seed. Act 2: the existing film timeline, unchanged in order, starting the moment the seed lands. Hero pin grows from ~190svh to ~330svh on desktop.
- Act 1 beats: at load the vine already wraps the word (gently swaying); scroll draws it further and gathers its strands into a trunk rising behind the word; branches spread; mint leaves and a few petal blossoms pop in; one seed swells on a branch, lets go, and falls along an arc to exactly where the film's seed hangs; the tree fades back as the film takes over (3D seed and film seed crossfade over a short span).
- Rendering: a second, small R3F canvas inside the hero, between the film and the word (the shared fixed canvas sits behind all page content, under the film). Procedural: tapered tubes that grow along curves, instanced leaves and blossoms, the seed from public/models/seed.glb. Colours from tokens (stem mint, petal, lotus pink). Deviation: CLAUDE.md's "one WebGL canvas" rule, needed for the layering.
- During Act 1 the film draws only its backdrop (cream and ridges), so its seed is not seen twice; at the handoff it fades its frame in.
- First screen: GIEO only (plus nav). The eyebrow, sub line, buttons, IB note and the "gieo · to sow" band no longer show on load; the sub line and the two buttons move to the end of the hero (with the last beat), the IB note stays in that beat.
- Tiers: Full only. Lite, Still, reduced motion, no JS: today's hero as it is (film or stills), no Act 1, but still no copy popping up on load.

**Non-goals.** No change to the film itself, the soil-to-plum seam, or the beats' wording (the seam stays for a later pass). No new copy keys.

**Left to the builder.** Curve shapes, timings and colours, tuned by eye with screenshots at 1440×900 and 390×844.
