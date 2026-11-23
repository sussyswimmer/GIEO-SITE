import Image from 'next/image';
import { Todo } from './Todo';

export type FramePhoto = { src: string; width: number; height: number; alt: string; consent: boolean };

type PhotoFrameProps = {
  photo: FramePhoto | undefined;
  /** CSS aspect-ratio, e.g. '4 / 5'. Reserves the box so nothing shifts (CLS). */
  ratio: string;
  sizes: string;
  caption?: string;
  className?: string;
};

/**
 * Consent-gated photo frame (DESIGN.md §5). Without `consent === true` it renders nothing in
 * production; in dev it shows an empty frame marked with Todo. The frame itself holds no text.
 */
export function PhotoFrame({ photo, ratio, sizes, caption, className }: PhotoFrameProps) {
  const box = { aspectRatio: ratio };

  if (photo?.consent !== true) {
    if (process.env.NODE_ENV === 'production') return null;
    return (
      <figure className={className}>
        <div
          className="relative overflow-hidden rounded-frame bg-(--petal-soft-a24)"
          style={box}
        >
          <div data-parallax className="flex size-full items-center justify-center">
            <Todo tag="photos" />
          </div>
        </div>
      </figure>
    );
  }

  return (
    <figure className={className}>
      <div className="relative overflow-hidden rounded-frame bg-paper" style={box}>
        <div data-parallax className="absolute inset-0">
          <Image src={photo.src} alt={photo.alt} fill sizes={sizes} className="object-cover" />
        </div>
      </div>
      {caption && <figcaption className="mt-3 text-caption text-ink-soft">{caption}</figcaption>}
    </figure>
  );
}
