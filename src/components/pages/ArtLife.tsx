import type { CSSProperties } from 'react';
import type { Art } from './art';

type ArtLifeProps = {
  art: Art;
  /** `collections.noinep.credit`: shown under a picture that has products in it. */
  credit?: string;
  sizes: string;
  /** On the first screen: fetched at once, at high priority, instead of lazily. */
  eager?: boolean;
  /** Travel each way against the scroll, in % of the picture's height (the runtime reads data-drift). */
  drift?: number;
  className?: string;
  creditClassName?: string;
};

/**
 * One decorative picture on a sub-page: an illustration from public/art or a Blender still. The home
 * page's StillLife with a srcset, so a phone takes the 800 px file. Empty alt text and no caption that
 * states a fact; the box has the picture's own proportions, unveils when it enters view (data-enter) and
 * drifts against the scroll. Without the runtime it simply sits there.
 */
export function ArtLife({ art, credit, sizes, eager, drift = 4, className, creditClassName }: ArtLifeProps) {
  return (
    <figure className={`pointer-events-none ${className ?? ''}`}>
      <div data-drift={drift}>
        <div data-enter style={{ aspectRatio: `${art.w} / ${art.h}` } as CSSProperties}>
          {/* A plain img: next/image without its optimizer has no srcset, and these files are already sized. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={art.src}
            srcSet={art.srcSet ?? (art.small && `${art.small} ${art.smallW ?? 800}w, ${art.src} ${art.w}w`)}
            sizes={(art.srcSet || art.small) && sizes}
            width={art.w}
            height={art.h}
            alt=""
            loading={eager ? 'eager' : 'lazy'}
            // The header still is the LCP element on every sub-page phone screen: ask for it first.
            fetchPriority={eager ? 'high' : undefined}
            decoding={eager ? 'sync' : 'async'}
            className="size-full object-contain"
          />
        </div>
      </div>
      {art.products && credit && <figcaption className={`text-caption text-fg-body ${creditClassName ?? ''}`}>{credit}</figcaption>}
    </figure>
  );
}
