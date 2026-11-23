/**
 * The seam between the hero and the weave (Maxwell, 2026-11-17, third and chosen version): the sprout's
 * roots grow down out of the soil, fan out, straighten into the cloth's warp threads, more warps fill in
 * between them, and the weft weaves across row by row. The finished cloth is the weave film's own at its
 * frame 89, where the film takes over and drapes it into the tote. Pure math shared by RootsScene, the
 * runtime and the tests. No imports: the tests load this file straight into node.
 */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const step = (x: number, a: number, b: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** The run, in screens of scroll: it starts with the last of the hero still on screen. */
export const ROOTS_FROM = 1.15; // the weave section's top, in screen heights, when the roots start
export const ROOTS_SPAN = 1.1;

/** 0 as the roots leave the sprout, 1 when the film has the cloth. */
export const rootsT = (craftTop: number, vh: number) => clamp01((ROOTS_FROM * vh - craftTop) / (ROOTS_SPAN * vh));

/** The film must wait on its finished cloth until the run is over: where its own scrub may start (top N%). */
export const FILM_START = `top ${Math.round((ROOTS_FROM - ROOTS_SPAN) * 100)}%`;

export type RootStages = {
  roots: number; // the roots grow down from the sprout to the top of the cloth
  warps: number; // the threads run down the cloth
  weave: number; // the weft crosses them, row by row from the top
  handoff: number; // this scene fades as the film's cloth fades in over it
};

export function rootStages(r: number): RootStages {
  return {
    roots: step(r, 0, 0.44),
    warps: step(r, 0.34, 0.64),
    weave: clamp01((r - 0.58) / 0.34), // linear: each row takes the same scroll
    handoff: step(r, 0.92, 1),
  };
}

/** Where the sprout stands in the soil in the seed film's last frame, per film set (normalised frame coords). */
export const ROOT_AT: Record<string, [number, number]> = { l: [0.604, 0.838], ls: [0.604, 0.838], p: [0.552, 0.852] };

/** The finished cloth in the weave film's frame 89: [x0, y0, x1, y1] of the square canvas. */
export const CLOTH_AT: [number, number, number, number] = [0.1323, 0.1323, 0.8667, 0.899];
export const CLOTH_YARNS = 46; // warps across, and weft rows down
export const CLOTH_STITCH = 0.65; // the mint warp, as a share of the cloth's width
