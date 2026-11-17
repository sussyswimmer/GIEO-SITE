'use client';

import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useMotionStore } from '@/lib/motion-store';

// One import, started early and reused by lazy(): the chunk (three.js, R3F, the scene) is on its way as
// soon as the page has loaded, so the vine is usually there before the first scroll.
let chunk: Promise<typeof import('./VineScene')> | null = null;
const load = () => (chunk ??= import('./VineScene'));
const VineCanvas = lazy(load);

/**
 * The hero's Act 1 layer (docs/superpowers/specs/2026-11-17-vine-hero-design.md): over the seed film, under
 * the word. On the Full tier it mounts its own small canvas (the shared one sits under all page content, so
 * it cannot draw over the film). While that loads, a slim loading bar under the word shows real progress
 * (Maxwell, 2026-11-17: without it the first scroll looked frozen): page loaded, tier known, code loaded,
 * scene drawn. On any other tier, with reduced motion, or without JS, there is no vine and no bar.
 */
export function VineStage() {
  const tier = useMotionStore((s) => s.tier);
  const [p, setP] = useState(0); // 0: no bar yet (server render, reduced motion)
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

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const raise = (to: number) => setP((now) => Math.max(now, to));
    const drawn = () => raise(1);
    raise(0.12);
    const onLoad = () => {
      raise(0.3);
      void load().then(() => raise(0.75), () => {
        setDone(true);
        setFailed(true);
      });
    };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    window.addEventListener('gieo:vine', drawn);
    const giveUp = setTimeout(() => setDone(true), 15000); // never leave a bar hanging
    return () => {
      window.removeEventListener('load', onLoad);
      window.removeEventListener('gieo:vine', drawn);
      clearTimeout(giveUp);
    };
  }, []);

  // The tier decides whether a vine is coming at all.
  useEffect(() => {
    if (!tier) return;
    if (tier === 'full') setP((now) => Math.max(now, 0.5));
    else setDone(true);
  }, [tier]);

  // Full: let the bar reach the end before it fades.
  useEffect(() => {
    if (p < 1) return;
    const id = setTimeout(() => setDone(true), 450);
    return () => clearTimeout(id);
  }, [p]);

  return (
    <div data-vine aria-hidden="true" className="pointer-events-none absolute inset-0">
      <canvas ref={cover} className="vine-cover" data-off={failed || (done && tier !== 'full') ? '' : undefined} />
      {tier === 'full' && (
        <Suspense fallback={null}>
          <VineCanvas />
        </Suspense>
      )}
      {p > 0 && (
        <div className="vine-load" data-done={done ? '' : undefined} style={{ '--p': p } as CSSProperties}>
          <span />
        </div>
      )}
    </div>
  );
}
