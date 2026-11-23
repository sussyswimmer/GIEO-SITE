'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * The Collections page's first screen (Maxwell, 2026-11-19): 21st.dev's "Parallax Scrolling" by Osmo
 * (https://21st.dev/@osmosupply/components/parallax-scrolling), fitted to this site. Four layers leave the
 * screen at four speeds as it scrolls: the dawn sky, the terraced hills, the title, and the cloth, spools
 * and vines in front. The pictures were generated for this page (Higgsfield, GPT Image 2.6) and live in
 * public/art/collections; they are decoration, so their alt text is empty.
 *
 * Changes from the original: the page already has Lenis and ScrollTrigger (motion-runtime.ts), so this
 * starts no second smooth scroll and kills only its own timeline; the title is the page's real <h1>;
 * reduced motion gets the still picture.
 */
const LAYERS = [
  { layer: '1', yPercent: 46 },
  { layer: '2', yPercent: 32 },
  { layer: '3', yPercent: 20 },
  { layer: '4', yPercent: 7 },
];

const ART = '/art/collections';
const set = (name: string) => `${ART}/${name}-1200.webp 1200w, ${ART}/${name}-2400.webp 2400w`;

export function ParallaxHero({ title, intro }: { title: string; intro: string }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const trigger = root.current?.querySelector('[data-parallax-layers]');
    if (!trigger || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const tl = gsap.timeline({ scrollTrigger: { trigger, start: '0% 0%', end: '100% 0%', scrub: 0 } });
    LAYERS.forEach(({ layer, yPercent }, i) =>
      tl.to(trigger.querySelectorAll(`[data-parallax-layer="${layer}"]`), { yPercent, ease: 'none' }, i === 0 ? undefined : '<'),
    );
    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <header ref={root} className="parallax">
      <div data-parallax-layers className="parallax__layers">
        {/* eslint-disable @next/next/no-img-element -- sized WebP files with their own srcset */}
        <img src={`${ART}/sky-2400.webp`} srcSet={set('sky')} sizes="100vw" alt="" data-parallax-layer="1" className="parallax__sky" fetchPriority="high" />
        <img src={`${ART}/hills-2400.webp`} srcSet={set('hills')} sizes="max(100vw, 150svh)" alt="" data-parallax-layer="2" className="parallax__ground" />
        <div data-parallax-layer="3" className="parallax__copy">
          <h1 className="parallax__title word-in font-serif italic text-fg-heading">{title}</h1>
          <p className="parallax__intro rise-in text-lead text-fg-strong">{intro}</p>
        </div>
        <img src={`${ART}/front-2400.webp`} srcSet={set('front')} sizes="max(100vw, 150svh)" alt="" data-parallax-layer="4" className="parallax__ground parallax__front" />
        {/* eslint-enable @next/next/no-img-element */}
      </div>
      <div className="parallax__fade" aria-hidden="true" />
    </header>
  );
}
