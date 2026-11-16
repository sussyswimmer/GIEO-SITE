/**
 * The page thread (docs/07 §3): one line from the seed film's stem to the end of the page, drawn by scroll,
 * stem mint shifting to lotus pink. Empty on the server: motion-runtime.ts builds the path from each
 * section's `data-thread-side`: loose S-curves down the gutters, changing side only in the gap between one
 * section's copy and the next, so it never crosses text. It sits on the z 0 layer, above section
 * backgrounds and under all copy, film stages and stills.
 * The scroll margin does nothing to an SVG: the runtime reads it as the gutter width in px.
 */
export function Thread() {
  return (
    <svg
      data-thread
      data-ornament
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-(--z-canvas) h-full w-full scroll-ml-gutter"
    >
      <defs>
        <linearGradient id="thread-ink" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--stem-mint)' }} />
          <stop offset="0.45" style={{ stopColor: 'var(--lotus-pink)' }} />
        </linearGradient>
      </defs>
      <path fill="none" stroke="url(#thread-ink)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
