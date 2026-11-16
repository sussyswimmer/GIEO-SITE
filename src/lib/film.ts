/**
 * The film contract (docs/07-redesign.md §4), as pure functions shared by the player (film-stage.ts),
 * the page thread (motion-runtime.ts) and the tests. public/film/<scene>/manifest.json has this shape.
 */
export type FilmSet = {
  id: string;
  w: number; // the displayed frame; an alpha mp4 is 2w × h (premultiplied RGB | alpha)
  h: number;
  focus?: [number, number]; // normalised; the cover fit is anchored here
  threadExit?: [number, number]; // seed only: where the stem leaves the frame
  textSafe?: [number, number, number, number]; // seed only: [x0, y0, x1, y1] kept free of busy detail
  root?: [number, number]; // seed only: where the sprout stands in the soil in the last frame; the hero's roots start here
};

export type FilmManifest = {
  scene: string;
  frames: number; // the source of truth: frame i = round(t · (frames − 1)), at video time i / fps
  fps: number;
  alpha: boolean;
  sets: FilmSet[];
  keys: number[]; // 0-based frame indices with a still at keys/<set id>-<iiii>.webp
  beats: Record<string, [number, number]>; // inclusive; neighbours share an endpoint
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const frameOf = (m: Pick<FilmManifest, 'frames'>, t: number) => Math.round(clamp01(t) * (m.frames - 1));

/** Index into `keys` of the still nearest a frame. */
export function nearestKey(keys: readonly number[], frame: number): number {
  let best = 0;
  keys.forEach((k, i) => {
    if (Math.abs(k - frame) < Math.abs(keys[best] - frame)) best = i;
  });
  return best;
}

/** By the box's aspect first (a portrait box takes a portrait set), then the smaller set for Lite or a box under 900 CSS px wide. */
export function pickSet(sets: readonly FilmSet[], boxW: number, boxH: number, lite: boolean): FilmSet {
  const portrait = boxH > boxW;
  const fit = sets.filter((s) => s.h > s.w === portrait);
  const pool = [...(fit.length ? fit : sets)].sort((a, b) => b.w * b.h - a.w * a.h);
  return lite || boxW < 900 ? pool[pool.length - 1] : pool[0];
}

/** Where a normalised point of the frame lands in a box the film covers (object-fit: cover, object-position: focus). */
export function coverPoint(set: FilmSet, boxW: number, boxH: number, [px, py]: [number, number]): [number, number] {
  const s = Math.max(boxW / set.w, boxH / set.h);
  const [fx, fy] = set.focus ?? [0.5, 0.5];
  return [(boxW - set.w * s) * fx + px * set.w * s, (boxH - set.h * s) * fy + py * set.h * s];
}

export const keyUrl = (scene: string, set: FilmSet, frame: number) =>
  `/film/${scene}/keys/${set.id}-${String(frame).padStart(4, '0')}.webp`;
