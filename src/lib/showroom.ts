/**
 * The Collections gallery track: one row (intro, bag, lipstick holder, order) slides left while the reader
 * scrolls down. Each product hangs in the air in the middle, turning slowly, then glides out as the next
 * glides in (Maxwell, 2026-11-17). Pure math shared by the row's driver (ShowroomDriver), the 3D
 * (ShowroomScene) and the tests. No React, no three.js.
 *
 * Maxwell, 2026-11-17: every scroll must visibly move something (no "freeze"), and the page must not be
 * spread out: the run is a few screens, and every screen is full. The pin is longer than docs/03's 150vh
 * at his request; scroll is never blocked.
 */

/** GIEO's products, the Nối Nếp collection: the Nối Bag and the Nếp Keychain (a lipstick holder). */
export type ProductKey = 'bag' | 'lipstick';
export const PRODUCT_KEYS: readonly ProductKey[] = ['bag', 'lipstick'];

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Hermite step between a and b, like GLSL smoothstep. */
export const step = (x: number, a: number, b: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The pinned run's length (svh) for a row of `products`, phone and desktop (64rem up), so each product gets
 * the same scroll however many there are. The row first held three, on 300svh and 260svh; globals.css now
 * sets runLength(2), checked by scripts/showroom.test.mjs. The run scales with the row's travel, in vw: intro + order + end padding + gutter - one screen (69 phone, -5
 * desktop) plus one product slot each (100vw phone, 76vw desktop).
 */
export function runLength(products: number) {
  const scale = (base: number, rest: number, slot: number) => Math.round((base * (rest + slot * products)) / (rest + slot * 3));
  return { phone: scale(300, 69, 100), desktop: scale(260, -5, 76) };
}

/** How far through the pinned run: 0 when the run's top meets the screen's top, 1 when the pin lets go. */
export const trackProgress = (top: number, height: number, vh: number) => clamp01(-top / Math.max(1, height - vh));

/** Where a slot sits, in slot widths from the middle of the screen: 0 centred, 1 one slot to the right. */
export const slotOffset = (left: number, width: number, vw: number) => (left + width / 2 - vw / 2) / Math.max(1, width);

/** 1 in the middle, 0 a slot or more away. */
export const focus = (d: number) => 1 - step(Math.abs(d), 0, 1);

/** Eases a displayed value toward its scroll target (docs/03 §1.6: glide, never snap). */
export function approach(current: number, target: number, rate = 0.14): number {
  const next = current + (target - current) * rate;
  return Math.abs(target - next) < 1e-4 ? target : next;
}

export type ProductPose = {
  /** Of the product's full size: one gliding out or in stands a little smaller. */
  scale: number;
  /** Stage units toward (+) or away from the viewer: it drifts back as it glides out. */
  z: number;
  /** Stage units up: it rises in from the lower right and leaves toward the upper left. */
  y: number;
  /** Fades only at the very edge of its glide. */
  opacity: number;
  /** Radians about the vertical from the scroll: a half turn per slot travelled (time adds a slow spin). */
  yaw: number;
};

/** A product's pose from its slot offset `d` (slotOffset). */
export function productPose(d: number): ProductPose {
  const f = focus(d);
  return {
    scale: lerp(0.78, 1, f),
    z: -0.5 * (1 - f),
    y: -0.22 * d,
    opacity: 1 - step(Math.abs(d), 0.75, 1.1),
    yaw: -0.35 - d * Math.PI,
  };
}

/** Scroll momentum, -1 to 1, from how far the row moved this frame (px, negative = left) and the screen width. */
export const momentum = (dx: number, vw: number) => Math.max(-1, Math.min(1, -dx / Math.max(1, vw * 0.012)));

/** Wraps x into [min, max): the drifting yarn re-enters on one side as it leaves the other. */
export const wrap = (x: number, min: number, max: number) => {
  const r = max - min;
  return ((((x - min) % r) + r) % r) + min;
};

/** The suspended float, from seconds: a slow bob and sway, each product on its own phase. */
export function hover(time: number, phase: number) {
  return {
    y: 0.03 * Math.sin(time * 1.1 + phase),
    tilt: 0.05 * Math.sin(time * 0.7 + phase * 1.7),
    spin: time * 0.22,
  };
}
