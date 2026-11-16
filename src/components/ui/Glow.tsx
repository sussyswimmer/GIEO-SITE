import { cx } from '@/lib/cx';

export type GlowKind = 'dawn' | 'blush' | 'dusk';

/**
 * The peach→blush "sun" (tokens --glow-dawn / -blush / -dusk). Decorative, no events.
 * Sits on the section background layer (z -1), so it must be inside a `position: relative`
 * parent that creates no stacking context (DESIGN.md §1). Only ink/plum text may sit on it.
 */
export function Glow({ kind, className }: { kind: GlowKind; className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-glow
      className={cx('pointer-events-none absolute inset-0 z-(--z-section-bg)', className)}
      style={{ backgroundImage: `var(--glow-${kind})` }}
    />
  );
}
