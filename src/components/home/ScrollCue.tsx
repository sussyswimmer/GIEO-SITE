'use client';

import { useEffect, useState } from 'react';

/**
 * A small arrow at the foot of the first screen that says "there is more below" (Maxwell, 2026-11-18; an
 * exception he asked for to "no scroll-down pill"). No words, so nothing to translate. It shows once the
 * loader is gone (CSS) and leaves for good as soon as the reader has scrolled.
 */
export function ScrollCue() {
  const [used, setUsed] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 24) {
        setUsed(true);
        window.removeEventListener('scroll', onScroll);
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="scroll-cue" data-used={used ? '' : undefined} aria-hidden="true">
      <svg viewBox="0 0 24 40" width="24" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v30" />
        <path d="M4 25l8 9 8-9" />
      </svg>
    </div>
  );
}
