'use client';

import { useEffect, useRef } from 'react';

const HOT = 'a, button, [role="button"], summary, label, select, input[type="submit"], input[type="checkbox"], input[type="radio"]';
const TYPING = 'input:not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]';
const PETAL_EVERY = 90; // px of travel between petals: very slight
const PETAL_MAX = 8;

/**
 * A dot for the pointer (Maxwell, 2026-11-17): it follows the mouse, opens into a ring over anything that
 * can be clicked, and now and then lets a tiny petal fall behind it. Mouse only: touch and pen keep their
 * own behaviour, text fields keep the text caret, and the native cursor comes back if this unmounts.
 * Reduced motion: the dot follows without easing and drops no petals. Decoration, hidden from assistive tech.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = dot.current;
    if (!el || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    let x = -100;
    let y = -100;
    let sx = x;
    let sy = y;
    let raf = 0;
    let seen = false;
    let travelled = 0;
    let petals = 0;

    const frame = () => {
      raf = 0;
      const k = calm ? 1 : 0.35;
      sx += (x - sx) * k;
      sy += (y - sy) * k;
      el.style.translate = `${sx.toFixed(1)}px ${sy.toFixed(1)}px`;
      if (Math.abs(x - sx) + Math.abs(y - sy) > 0.3) raf = requestAnimationFrame(frame);
    };

    const petal = (px: number, py: number) => {
      if (petals >= PETAL_MAX) return;
      petals++;
      const p = document.createElement('span');
      p.className = 'cursor-petal';
      p.style.left = `${px}px`;
      p.style.top = `${py}px`;
      p.style.backgroundColor = Math.random() < 0.5 ? 'var(--petal-soft)' : 'var(--lotus-pink)';
      const turn = (Math.random() - 0.5) * 220;
      const dx = (Math.random() - 0.5) * 26;
      const s = 0.6 + Math.random() * 0.6;
      document.body.append(p);
      p.animate(
        [
          { opacity: 0, transform: `translate(-50%, -50%) rotate(${turn * 0.2}deg) scale(${s * 0.4})` },
          { opacity: 0.75, offset: 0.2 },
          { opacity: 0, transform: `translate(calc(-50% + ${dx}px), calc(-50% + 30px)) rotate(${turn}deg) scale(${s})` },
        ],
        { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(0.2, 0.6, 0.3, 1)' },
      ).onfinish = () => {
        p.remove();
        petals--;
      };
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      if (!seen) {
        seen = true;
        sx = e.clientX;
        sy = e.clientY;
        root.dataset.cursor = 'on'; // hides the native cursor (globals.css) only once ours is on screen
      } else if (!calm) {
        travelled += Math.hypot(e.clientX - x, e.clientY - y);
        if (travelled > PETAL_EVERY) {
          travelled = 0;
          petal(e.clientX, e.clientY);
        }
      }
      x = e.clientX;
      y = e.clientY;
      const t = e.target instanceof Element ? e.target : null;
      el.dataset.state = t?.closest(TYPING) ? 'text' : t?.closest(HOT) ? 'hot' : '';
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const leave = () => (el.dataset.state = 'out');
    const down = () => el.toggleAttribute('data-down', true);
    const up = () => el.toggleAttribute('data-down', false);

    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      delete root.dataset.cursor;
      document.querySelectorAll('.cursor-petal').forEach((p) => p.remove());
    };
  }, []);

  return <div ref={dot} aria-hidden="true" className="cursor-dot" data-state="out" />;
}
