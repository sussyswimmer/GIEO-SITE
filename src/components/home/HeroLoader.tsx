'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { loadVine } from '@/components/motion/VineStage';
import { useMotionStore } from '@/lib/motion-store';

/**
 * The home page's loader (Maxwell, 2026-11-18; an exception he asked for to "no full-screen preloader"):
 * a cream screen with the word and a bar, there from the first paint, which fades into the hero once the
 * vine is drawn. The bar shows real steps: page loaded, tier known, scene code loaded, scene drawn. Where
 * no vine is coming (another tier), it goes as soon as that is known.
 *
 * It can never be left up: without JS it is not shown (a <noscript> rule in the page), with reduced motion
 * it is not shown (CSS), a CSS animation takes it away after 12 s whatever happens, and so does a timer.
 */
export function HeroLoader({ word }: { word: string }) {
  const tier = useMotionStore((s) => s.tier);
  const [p, setP] = useState(0.08);
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const raise = (to: number) => setP((now) => Math.max(now, to));
    const drawn = () => raise(1);
    const onLoad = () => {
      raise(0.3);
      void loadVine().then(() => raise(0.75), () => setDone(true));
    };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    window.addEventListener('gieo:vine', drawn);
    if (document.documentElement.dataset.vineReady) drawn();
    const giveUp = setTimeout(() => setDone(true), 10000);
    return () => {
      window.removeEventListener('load', onLoad);
      window.removeEventListener('gieo:vine', drawn);
      clearTimeout(giveUp);
    };
  }, []);

  // The tier decides whether a vine is coming at all: if not, there is nothing more to wait for.
  useEffect(() => {
    if (!tier) return;
    setP((now) => Math.max(now, tier === 'full' ? 0.5 : 1));
  }, [tier]);

  // Let the bar reach the end, then fade, then leave the page altogether.
  useEffect(() => {
    if (p < 1) return;
    const id = setTimeout(() => setDone(true), 350);
    return () => clearTimeout(id);
  }, [p]);
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setGone(true), 800);
    return () => clearTimeout(id);
  }, [done]);

  // While it is up nothing under it scrolls, and the scroll cue waits. Set here, not in CSS alone, so that it
  // is always this script that lifts it again. Reduced motion: the loader is not shown, so nothing is held.
  useEffect(() => {
    if (done || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.dataset.loading = '';
    return () => {
      delete document.documentElement.dataset.loading;
    };
  }, [done]);

  if (gone) return null;
  return (
    <div className="site-loader" data-done={done ? '' : undefined} aria-hidden="true">
      <p className="font-serif text-plum-ink">{word}</p>
      <div className="site-loader-bar" style={{ '--p': p } as CSSProperties}>
        <span />
      </div>
    </div>
  );
}
