'use client';

import { lazy, Suspense, useEffect } from 'react';
import { useMotionStore } from '@/lib/motion-store';

const RootsCanvas = lazy(() => import('./RootsScene'));

/**
 * The seam's layer (RootsScene): a fixed, see-through canvas over the page, between the hero and the weave.
 * Full tier only. It marks <html data-roots="on"> before the motion runtime mounts, so the weave film knows
 * to wait on its finished cloth (motion-runtime, mountWeave). Elsewhere the film plays as it did.
 */
export function RootsStage() {
  const full = useMotionStore((s) => s.tier === 'full');
  useEffect(() => {
    if (!full) return;
    document.documentElement.dataset.roots = 'on';
    return () => {
      delete document.documentElement.dataset.roots;
    };
  }, [full]);
  if (!full) return null;
  return (
    <div data-roots-stage aria-hidden="true" className="pointer-events-none fixed inset-0 z-(--z-content)">
      <Suspense fallback={null}>
        <RootsCanvas />
      </Suspense>
    </div>
  );
}
