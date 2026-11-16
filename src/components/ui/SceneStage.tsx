import type { CSSProperties } from 'react';
import { cx } from '@/lib/cx';

export type SceneName = 'seed' | 'weave' | 'lotus';

// Phase 1: a still gradient only. Phase 2+ reads this box's getBoundingClientRect() for the canvas,
// so the box must keep its size in every tier. Never put text, or a drawing, in here (DESIGN.md §5).
const STILL: Record<SceneName, string> = {
  seed: 'var(--still-seed)',
  weave: 'var(--still-loom)',
  lotus: 'var(--still-bloom)',
};

/** Reserved box for one of the three 3D scenes. Placement comes from the caller's className. */
export function SceneStage({ scene, className }: { scene: SceneName; className?: string }) {
  return (
    <div
      data-scene-stage={scene}
      aria-hidden="true"
      className={cx('scene-stage pointer-events-none', className)}
      style={{ '--still': STILL[scene] } as CSSProperties}
    />
  );
}
