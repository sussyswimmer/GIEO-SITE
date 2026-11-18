'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useMotionStore } from '@/lib/motion-store';

// One import, started early and reused by lazy(): the chunk (three.js, R3F, the scene) is on its way as
// soon as the page has loaded, so the vine is usually there before the first scroll.
let chunk: Promise<typeof import('./VineScene')> | null = null;
/** Starts (once) the scene's code on its way; HeroLoader waits on it too. */
export const loadVine = () => (chunk ??= import('./VineScene'));
const VineCanvas = lazy(loadVine);

/**
 * The hero's Act 1 layer (docs/superpowers/specs/2026-11-17-vine-hero-design.md): over the seed film, under
 * the word. On the Full tier it mounts its own small canvas (the shared one sits under all page content, so
 * it cannot draw over the film). While that loads, the page's loader is up (HeroLoader). On any other tier,
 * with reduced motion, or without JS, there is no vine.
 */
export function VineStage() {
  const tier = useMotionStore((s) => s.tier);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false); // the scene's code did not load: no vine, so no cover either
  const cover = useRef<HTMLCanvasElement>(null);

  // The cover: the film's own backdrop (cream and ridges, film-stage's `backdrop()`), painted over the film
  // as soon as the film says which frame size it uses. It hides the film's seed until the tree drops it,
  // from the first paint of the film and without waiting for the 3D; VineScene fades it at the handoff, and
  // where no vine is coming (`done` on another tier) it fades away at once and the film shows as before.
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = cover.current;
    const stage = canvas?.closest('[data-hero-ground]')?.querySelector<HTMLElement>('[data-film]');
    if (!canvas || !stage) return;
    const vista = new Image();
    vista.src = '/art/hero/vista.webp';
    let painted = '';
    let dead = false;
    const paint = async () => {
      const { set, size, focus } = stage.dataset;
      if (dead || !set || !size || !focus || !vista.complete || !vista.naturalWidth || painted === set) return;
      const { backdrop } = await import('@/lib/film-stage');
      if (dead) return;
      const [w, h] = size.split(',').map(Number);
      const [fx, fy] = focus.split(',').map(Number);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      backdrop(ctx, vista, { id: set, w, h, focus: [fx, fy] }, 0);
      canvas.style.objectPosition = `${fx * 100}% ${fy * 100}%`;
      painted = set;
      canvas.dataset.on = '';
    };
    vista.addEventListener('load', paint);
    const watch = new MutationObserver(paint); // the film writes data-set when its manifest is in, and again on a resize
    watch.observe(stage, { attributes: true, attributeFilter: ['data-set'] });
    void paint();
    return () => {
      dead = true;
      watch.disconnect();
      vista.removeEventListener('load', paint);
    };
  }, []);

  // Where no vine is coming (another tier, or its code failed to load), the cover goes and the film shows.
  useEffect(() => {
    if (tier && tier !== 'full') setDone(true);
  }, [tier]);
  useEffect(() => {
    if (tier !== 'full') return;
    let live = true;
    loadVine().catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [tier]);

  return (
    <div data-vine aria-hidden="true" className="pointer-events-none absolute inset-0">
      <canvas ref={cover} className="vine-cover" data-off={failed || (done && tier !== 'full') ? '' : undefined} />
      {tier === 'full' && (
        <Suspense fallback={null}>
          <VineCanvas />
        </Suspense>
      )}
    </div>
  );
}
