import type { SceneName } from '@/components/ui/SceneStage';
import type { LotusBeat, WeaveBeat } from './motion-store';

/**
 * Lite and Still replay each scene along one timeline t in [0, 1]. The Full tier's beats are laid end to end,
 * each taking a share of t equal to its weight (about its scroll length), so t = Σ w·v / Σ w rises monotonically with scroll.
 * Shared by the fallback runtime and the capture script (through the QA hook), so frames and playback cannot drift apart.
 */
type Track<B extends string> = { beats: readonly B[]; weights: readonly number[]; frames: number; keys: readonly number[] };

const WEAVE: readonly WeaveBeat[] = ['thread', 'warps', 'weave', 'drape', 'bag', 'lipstick'];
const LOTUS: readonly LotusBeat[] = ['rise', 'p1', 'p2', 'p3', 'bloom', 'finale'];

// Still key frames are beat ends, given as beat indices (seed: as t, it has one beat).
const endOf = (weights: readonly number[], i: number) =>
  weights.slice(0, i + 1).reduce((a, b) => a + b, 0) / weights.reduce((a, b) => a + b, 0);
const WEAVE_W = [1.5, 1, 2, 1, 1, 1];
const LOTUS_W = [1, 1.5, 1.5, 1.5, 0.75, 1.5];

export const TRACKS = {
  // Frame counts are docs/07 §4's; scripts/timeline.test.mjs holds them to public/film/<scene>/manifest.json.
  // seed: one scrub across the hero pin; its keys are the film's beat ends (fall 0–40, sprout 40–95, thread 95–149).
  seed: { beats: ['seed'], weights: [1], frames: 150, keys: [0, 40 / 149, 95 / 149, 1] },
  // warps strung, cloth woven, the Nối Bag, the Nếp Keychain (the Nối Nếp collection)
  weave: { beats: WEAVE, weights: WEAVE_W, frames: 150, keys: [1, 2, 4, 5].map((i) => endOf(WEAVE_W, i)) },
  // bud, petal 1, petal 2, petal 3, bloom (the finale's top-down turn and falling seeds stay in Full and Lite)
  lotus: { beats: LOTUS, weights: LOTUS_W, frames: 160, keys: [0, 1, 2, 3, 4].map((i) => endOf(LOTUS_W, i)) },
} satisfies Record<SceneName, Track<string>>;

/** The weave's products, in film order: every beat after the drape (bag, lipstick). */
export const WEAVE_PRODUCTS = WEAVE.slice(4);

/**
 * The weave's product run (docs/08 H2), in svh of scroll. The film is not re-timed: scroll is mapped to it
 * piecewise. Each product rests on its last frame (a Still key) for `hold`, and the film moves from one to
 * the next over `change`. The runtime pins the product names for `weaveRun` (a rest for each product and a
 * change between each two) and reads its trigger offsets from these numbers; scripts/timeline.test.mjs
 * holds them to the brief's floors.
 */
export const WEAVE_PACE = { phone: { hold: 48, change: 14 }, wide: { hold: 54, change: 26 } } as const;
export const weaveRun = ({ hold, change }: { hold: number; change: number }) =>
  WEAVE_PRODUCTS.length * hold + (WEAVE_PRODUCTS.length - 1) * change;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const total =(w: readonly number[]) => w.reduce((a, b) => a + b, 0);

/** The store slice each scene reads. */
export type TimelineState = { seed: number; weave: Record<WeaveBeat, number>; lotus: Record<LotusBeat, number> };

export function beatValues(scene: SceneName, s: TimelineState): number[] {
  if (scene === 'seed') return [s.seed];
  const rec = s[scene] as Record<string, number>;
  return TRACKS[scene].beats.map((b) => rec[b]);
}

export function timeOf(scene: SceneName, s: TimelineState): number {
  const { weights } = TRACKS[scene];
  const v = beatValues(scene, s);
  return weights.reduce((acc, w, i) => acc + w * clamp01(v[i]), 0) / total(weights);
}

/** Inverse of timeOf for a sequential pose: earlier beats complete, later beats at 0. */
export function beatsAt(scene: SceneName, t: number): number[] {
  const { weights } = TRACKS[scene];
  let x = clamp01(t) * total(weights);
  return weights.map((w) => {
    const v = clamp01(x / w);
    x -= w;
    return v;
  });
}

export const frameAt = (scene: SceneName, t: number) => Math.round(clamp01(t) * (TRACKS[scene].frames - 1));

/** Nearest Still key frame. */
export function keyAt(scene: SceneName, t: number): number {
  const { keys } = TRACKS[scene];
  let best = 0;
  keys.forEach((k, i) => {
    if (Math.abs(k - t) < Math.abs(keys[best] - t)) best = i;
  });
  return best;
}
