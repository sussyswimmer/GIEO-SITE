'use client';

import { useEffect } from 'react';
import { approach, focus, slotOffset, trackProgress } from '@/lib/showroom';

/**
 * Moves the Collections track: while the run is pinned, scrolling down slides the row left (eased, never
 * snapped), and each slot gets --f, how centred it is (its name brightens as it arrives). It turns the
 * track layout on (html[data-track]) only when motion is welcome; without it, or without JS, the products
 * stack as a plain list. ShowroomScene reads the slots' boxes, so the 3D follows the row with no extra state.
 */
export function ShowroomDriver() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const run = document.querySelector<HTMLElement>('[data-showroom-run]');
    const track = document.querySelector<HTMLElement>('[data-showroom-track]');
    if (!run || !track) return;
    const root = document.documentElement;
    root.dataset.track = 'on';
    const slots = [...track.querySelectorAll<HTMLElement>('[data-showroom-slot]')];

    let shown = -1;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const r = run.getBoundingClientRect();
      const vw = root.clientWidth;
      const target = trackProgress(r.top, r.height, window.innerHeight);
      shown = shown < 0 ? target : approach(shown, target);
      track.style.translate = `${(-shown * Math.max(0, track.scrollWidth - vw)).toFixed(1)}px 0`;
      for (const s of slots) {
        const b = s.getBoundingClientRect();
        s.style.setProperty('--f', focus(slotOffset(b.left, b.width, vw)).toFixed(3));
      }
      if (shown !== target) raf = requestAnimationFrame(tick);
    };
    const ask = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    ask();
    window.addEventListener('scroll', ask, { passive: true });
    window.addEventListener('resize', ask);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', ask);
      window.removeEventListener('resize', ask);
      track.style.translate = '';
      delete root.dataset.track;
    };
  }, []);

  return null;
}
