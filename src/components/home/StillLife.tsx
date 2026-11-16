import type { CSSProperties } from 'react';
import Image from 'next/image';
import type { Still } from '@/lib/stills';

type StillLifeProps = {
  still: Still;
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
 * One Blender still-life (docs/07 §4): decorative, so empty alt text and no caption that states a fact.
 * The box has the render's own proportions and is meant to be large: its margins are transparent, so it may
 * run under type and past a section's edge. It unveils with a clip-path when it enters view and its layers
 * drift at different speeds (the runtime reads data-enter and data-drift; without it the still simply sits there).
 */
export function StillLife({ still, credit, sizes, index = 0, className, creditClassName }: StillLifeProps) {
  const box = { aspectRatio: `${still.w} / ${still.h}`, transitionDelay: `calc(${index} * var(--stagger))` } as CSSProperties;
  return (
    <figure className={`pointer-events-none ${className ?? ''}`}>
      <div data-enter className="relative" style={box}>
        <Image src={still.src} alt="" fill unoptimized sizes={sizes} data-drift="4" className="object-contain" />
        {still.fg && (
          <Image src={still.fg} alt="" fill unoptimized sizes={sizes} data-drift="9" className="object-contain" />
        )}
      </div>
      {still.products && <figcaption className={`text-caption text-fg-body ${creditClassName ?? ''}`}>{credit}</figcaption>}
    </figure>
  );
}
