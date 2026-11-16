'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { usePathname } from 'next/navigation';
import { useMotionTier } from '@/hooks/useMotionTier';
import { afterLoad } from '@/lib/after-load';
import { BOOT_DELAY_MS } from '@/lib/motion';

export function MotionBoot() {
  const pathname = usePathname(); // covers the locale prefix
  const [ready, setReady] = useState(false);
  const tier = useMotionTier(ready);
  const [Scene, setScene] = useState<ComponentType | null>(null);

  // 1. Past the load window, or the reader has started moving (never before load).
  useEffect(() => {
    let done = false;
    const go = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    const cancelTimer = afterLoad(go, BOOT_DELAY_MS);
    let cancelIntent = () => {};
    const onIntent = () => {
      cancelIntent = afterLoad(go);
    };
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, onIntent, { once: true, passive: true }));
    return () => {
      cancelTimer();
      cancelIntent();
      events.forEach((e) => window.removeEventListener(e, onIntent));
    };
  }, []);

  // 2. Mount page motion once per route, once the tier is known (the films read it from the store).
  useEffect(() => {
    if (!tier) return;
    let cancelled = false;
    let cleanup = () => {};
    void import('@/lib/motion-runtime').then(({ mountPage }) => {
      if (!cancelled) cleanup = mountPage();
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [tier, pathname]);

  // 3. The films (docs/07 §4): after load, so the hero film never competes with the LCP text. They show
  // their posters on their own and start scrubbing when effect 2 has a tier and scroll positions for them.
  useEffect(() => {
    if (!document.querySelector('[data-film]')) return;
    let cancelled = false;
    let cleanup = () => {};
    const cancel = afterLoad(() => {
      void import('@/lib/film-stage').then(({ mountFilms }) => {
        if (!cancelled) cleanup = mountFilms();
      });
    });
    return () => {
      cancelled = true;
      cancel();
      cleanup();
    };
  }, [pathname]);

  // 4. The R3F canvas (kept, not mounted by the home page since the redesign: no page has a [data-scene-stage]): Full tier only, and only on a page with a stage.
  useEffect(() => {
    if (tier !== 'full' || Scene || !document.querySelector('[data-scene-stage]')) return;
    void import('./SceneCanvas').then((m) => setScene(() => m.SceneCanvas));
  }, [tier, pathname, Scene]);

  return Scene ? <Scene /> : null;
}
