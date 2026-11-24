import { create } from 'zustand';
import type { SceneName } from '@/components/ui/SceneStage';
import type { Tier } from './tier';

export type WeaveBeat = 'thread' | 'warps' | 'weave' | 'drape' | 'bag' | 'lipstick';
export type LotusBeat = 'rise' | 'p1' | 'p2' | 'p3' | 'bloom' | 'finale';

type MotionState = {
  tier: Tier | null;
  activeScene: SceneName | null;
  progress: Record<SceneName, number>;
  near: Record<SceneName, boolean>; // latch: the section has been within ~1.5 viewports; never reset
  weave: Record<WeaveBeat, number>;
  lotus: Record<LotusBeat, number>;
  seed: number; // 0 to 1 across the hero's 115svh pin; q of the baked Sprout clip
  requestRender: () => void; // set by SceneCanvas (R3F invalidate); keeps R3F out of the gsap chunk
};

export const useMotionStore = create<MotionState>(() => ({
  tier: null,
  activeScene: null,
  progress: { seed: 0, weave: 0, lotus: 0 },
  near: { seed: false, weave: false, lotus: false },
  weave: { thread: 0, warps: 0, weave: 0, drape: 0, bag: 0, lipstick: 0 },
  lotus: { rise: 0, p1: 0, p2: 0, p3: 0, bloom: 0, finale: 0 },
  seed: 0,
  requestRender: () => {},
}));
