# Skills to Load

Two sources: Maxwell's **god-site-skill** plugin (already bundles ~50 website skills pulled from Promptkura) and extra items from the **Promptkura** library installed by `setup-skills.sh`.

Load a skill right before the phase that needs it, not all at once.

## Already in god-site-skill (use these names)

| Phase | Skills |
|---|---|
| 0 to 1 (design + static build) | `god-site-skill:high-end-visual-design`, `god-site-skill:typography-first`, `god-site-skill:anti-ui-slop`, `god-site-skill:emil-design-eng`, `god-site-skill:design-system`, `god-site-skill:copywriting` (DRAFT lines only), `god-site-skill:frontend-seo` |
| 2 (motion infra) | `god-site-skill:scroll-experience`, `god-site-skill:gsap-framer-scroll-animation`, `god-site-skill:ui-motion`, `god-site-skill:pro-motion` |
| 3 to 5 (3D) | `god-site-skill:premium-3d-website`, `god-site-skill:3d-web-experience`, `god-site-skill:threejs-fundamentals`, `god-site-skill:threejs-loaders`, `god-site-skill:threejs-materials`, `god-site-skill:threejs-lighting`, `god-site-skill:threejs-shaders`, `god-site-skill:shader-programming-glsl`, `god-site-skill:threejs-animation`, `god-site-skill:threejs-postprocessing`, `god-site-skill:threejs-interaction` |
| 6 to 7 (perf + QA) | `god-site-skill:fixing-motion-performance`, `god-site-skill:web-performance-optimization`, `god-site-skill:frontend-lighthouse`, `god-site-skill:review-animations`, `god-site-skill:webapp-testing` |

If the plugin isn't installed in this Claude Code, the same skills are on Promptkura under these slugs: `sickn33/premium-3d-website`, `davila7/3d-web-experience`, `davila7/scroll-experience`, `github/gsap-framer-scroll-animation`, `sickn33/pro-motion`, `sickn33/gpt-taste`.

## Extra from Promptkura (installed by `setup-skills.sh`)

| Slug | Type | Why |
|---|---|---|
| `davila7/3d-artist` | agent | 3D asset creation workflow, good for the Blender scene scripts |
| `patrickjs/blender-python-addon` | rule | Correct `bpy` patterns for the scene scripts |
| `f/blender-object-maker` | prompt | Turning a described object (bag, seed, lotus petal) into Blender Python |
| `github/adobe-creative-cloud` | agent | After Effects / Lottie work |

Skills on Promptkura are community content under each author's license; the CLI prints the credit and license on install. Read each SKILL.md once before relying on it, and if a skill's advice conflicts with `03-motion-and-3d.md` (scroll rules, budgets), this kit wins.
