/**
 * The hero's Act 1 (docs/superpowers/specs/2026-11-17-vine-hero-design.md): the word GIEO with a vine
 * around it, a tree growing from the vine, and the one seed it drops, which lands where the seed film's
 * own seed hangs in its frame 0. Pure math shared by VineScene, motion-runtime (the remap) and the tests.
 */

// Local, not imported: the tests load this file straight into node, which needs no other module.
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const step = (x: number, a: number, b: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Act 1's share of the hero pin, in svh of scroll (added to the hero run while the vine is on). */
export const ACT1_SVH = 180;

/** Act 1 progress: 0 at the top of the page, 1 after ACT1_SVH of scroll into the hero. */
export const act1 = (heroTop: number, vh: number) => clamp01(-heroTop / ((ACT1_SVH / 100) * vh));

export type Stages = {
  vine: number; // how much of the vine is drawn: already most of the way round the word at load
  trunk: number;
  branches: number;
  leaves: number;
  blossoms: number;
  swell: number; // the seed grows on its branch tip
  fall: number; // and drops
  fade: number; // the painted backdrop gives way to the film under it
};

/**
 * The journey first (Maxwell, 2026-11-17: the vine travels round the letters, then the tree sprouts from
 * it): the vine grows round G, I, E and O over the first half, at an even pace (linear, so the tip never
 * stalls); the trunk sprouts from its end; branches, leaves and blossoms follow; then the seed.
 */
export function stages(a: number): Stages {
  const t = step(a, 0.86, 0.975);
  return {
    vine: 0.14 + 0.86 * clamp01(a / 0.5), // on screen from the start: up and over the first letter
    trunk: step(a, 0.46, 0.62),
    branches: step(a, 0.56, 0.74),
    leaves: step(a, 0.6, 0.8),
    blossoms: step(a, 0.7, 0.82),
    swell: step(a, 0.78, 0.86),
    fall: t * t, // gravity: slow off the branch, fast at the end
    // only the painted backdrop fades (the plant stays): the film's seed appears under the 3D one as it lands
    fade: step(a, 0.955, 1),
  };
}

/** The seed's path: a little lift off the branch, then an arc down that ends exactly at `to` (y up). */
export function fallPoint(from: [number, number], to: [number, number], t: number): [number, number] {
  const c: [number, number] = [from[0] + (to[0] - from[0]) * 0.2, from[1] + 0.15 * Math.abs(to[1] - from[1])];
  const u = 1 - t;
  return [u * u * from[0] + 2 * u * t * c[0] + t * t * to[0], u * u * from[1] + 2 * u * t * c[1] + t * t * to[1]];
}

/** A position on the old hero timeline, moved into what is left of the run after Act 1 (`share` of it). */
export const remap = (x: number, share: number) => share + x * (1 - share);

/** Where the seed hangs in the seed film's frame 0, per set (normalised frame coordinates), and its height. */
export const SEED_AT: Record<string, { at: [number, number]; h: number }> = {
  l: { at: [0.624, 0.532], h: 0.3 },
  ls: { at: [0.624, 0.531], h: 0.3 },
  p: { at: [0.488, 0.624], h: 0.27 },
};
