// DESIGN.md §6. Only what Phase 2 uses.
export const BOOT_DELAY_MS = 2500;
export const LENIS_OPTIONS = { duration: 1.1, smoothWheel: true, syncTouch: false, stopInertiaOnNavigate: true } as const;
export const SCRUB = 0.8;
export const REVEAL_START = 'top 88%';
export const DRAW_START = 'top 92%';
export const SCENE_FADE = 0.1;
export const PARALLAX_PERCENT = 4; // ±4% = 8% travel, inside the kit's 6–10%
export const PARALLAX_SCALE = 1.12;
export const ENTER_SCALE = 1.04;
export const HERO_GHOST_TOP = 96; // px from the top of the screen: where the shrunken hero word rests, clear of the nav pill
export const THREAD_TIP = 0.62; // the page thread is drawn down to this share of the screen height
