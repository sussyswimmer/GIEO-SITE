import type { CSSProperties } from 'react';

/** A Blender still (src/lib/stills.ts) or an illustration from public/art (components/pages/art.ts). */
type Picture = {
  src: string;
  /** Foreground layer of the same size, for parallax. */
  fg?: string;
  /** An 800 px version, served to narrow screens. */
  small?: string;
  /** The small file's real width in px; 800 if not given. */
  smallW?: number;
  w: number;
  h: number;
  products: boolean;
};

type StillLifeProps = {
  still: Picture;
  /** `collections.hmong.credit`: shown under a still that has products in it. */
  credit: string;
  sizes: string;
  /** Position in a group, for the staggered unveil. */
  index?: number;
  className?: string;
  /** Where the credit sits under the image: the render's own margins are transparent, so line it up with the objects. */
  creditClassName?: string;
};

/**
 * One still-life or cut-out (docs/07 §4, docs/08 §2): decorative, so empty alt text and no caption that
 * states a fact. The box has the picture's own proportions and is meant to be large: its margins are
 * transparent, so it may run under type and past a section's edge. It unveils with a clip-path when it enters
 * view and its layers drift at different speeds (the runtime reads data-enter and data-drift; without it the
 * still simply sits there). The drift is gentle: 3 % of the picture's height across the screen, 6 % for a
 * foreground layer (docs/08 H3). Lazy and never a priority image, so it cannot become the LCP element.
 */
export function StillLife({ still, credit, sizes, index = 0, className, creditClassName }: StillLifeProps) {
  const box = { aspectRatio: `${still.w} / ${still.h}`, transitionDelay: `calc(${index} * var(--stagger))` } as CSSProperties;
  const layer = (src: string, drift: number, small?: string) => (
    // eslint-disable-next-line @next/next/no-img-element -- already sized WebP; the optimiser would only re-encode it
    <img
      src={src}
      srcSet={small ? `${small} ${still.smallW ?? 800}w, ${src} ${still.w}w` : undefined}
      sizes={small ? sizes : undefined}
      alt=""
      loading="lazy"
      decoding="async"
      data-drift={drift}
      className="absolute inset-0 size-full object-contain"
    />
  );
  return (
    <figure className={`pointer-events-none ${className ?? ''}`}>
      <div data-enter className="relative" style={box}>
        {layer(still.src, 1.5, still.small)}
        {still.fg && layer(still.fg, 3)}
      </div>
      {still.products && <figcaption className={`text-caption text-fg-body ${creditClassName ?? ''}`}>{credit}</figcaption>}
    </figure>
  );
}
