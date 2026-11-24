/**
 * The page thread (docs/07 §3, docs/08 H1), now a vine: below the weave the hero's vine comes back and
 * grows to the end of the page, drawn by scroll, putting out leaves, tendrils and blossoms as its tip passes. Empty on the server: motion-runtime.ts builds the paths from each section's `data-thread-side`:
 * loose S-curves down the gutters, leaning in only in the gap between one section's copy and the next, so
 * it never crosses text. It sits on the z 0 layer, above section backgrounds and under all copy, film
 * stages and stills.
 * The scroll margin does nothing to an SVG: the runtime reads it as the gutter width in px.
 */
export function Thread() {
  return (
    <svg
      data-thread
      data-ornament
      aria-hidden="true"
      className="pvine pointer-events-none absolute inset-0 z-(--z-canvas) h-full w-full scroll-ml-gutter"
    >
      {/* The seam (docs/08 H1): from the hero's root straight into the top of the weave film's yarn. Hidden since 2026-11-17. */}
      <path data-thread-in fill="none" strokeWidth="2" strokeLinecap="round" style={{ stroke: 'var(--stem-mint)' }} />
      {/* The vine (Maxwell, 2026-11-19: the line that follows you down is the hero's vine): a stem with a
          lighter side, and the leaves, tendrils and blossoms the runtime stands along it. */}
      <path data-thread-run className="pvine-stem" fill="none" strokeLinecap="round" />
      <path data-thread-light className="pvine-light" fill="none" strokeLinecap="round" />
      <g data-thread-buds />
      <g data-thread-tip />
    </svg>
  );
}
