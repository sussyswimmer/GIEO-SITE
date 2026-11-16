import type { CSSProperties } from 'react';
import { cx } from '@/lib/cx';
import type { SceneName } from './SceneStage';

// What the stage shows until its film has drawn, and for good when public/film/<scene>/ is missing.
const STILL: Record<SceneName, string> = {
  seed: 'var(--still-seed)',
  weave: 'var(--still-loom)',
  lotus: 'var(--still-bloom)',
};

/**
 * The box one Blender film plays in (docs/07 §4). Server-rendered empty: film-stage.ts reads the film's
 * manifest after load and adds the canvases. Never put text or a drawing in here. Size and position
 * come from the caller's className; the film is fitted with `cover` on its focus point.
 */
export function FilmStage({ scene, className }: { scene: SceneName; className?: string }) {
  return (
    <div
      data-film={scene}
      aria-hidden="true"
      className={cx('scene-stage pointer-events-none', className)}
      style={{ '--still': STILL[scene] } as CSSProperties}
    />
  );
}
