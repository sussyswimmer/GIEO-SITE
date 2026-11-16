import { cx } from '@/lib/cx';

type ScrubClipProps = {
  /** File name in public/art/loops: <name>.mp4, <name>.webp (first frame) and <name>-end.webp (last frame). */
  name: string;
  /** The clip's pixel size; the box takes its proportions unless `className` sets another aspect (the clip then covers it). */
  w: number;
  h: number;
  frames?: number;
  fps?: number;
  /** The flat tone the box stands on. The clip's own ground is a shade above cream; it is blended away against this. */
  ground?: 'cream' | 'paper';
  className?: string;
};

const GROUND = { cream: 'bg-cream', paper: 'bg-paper' } as const;

/**
 * A short clip scrubbed by scroll (docs/08 §2): it plays forward as its box rises through the screen.
 * Server-rendered empty, like a film stage: scrub-clip.ts draws the poster and the frames into a canvas, so
 * it can never be the LCP element, and shows the last frame as a still under reduced motion or Save-Data.
 * Decoration only. Use it on a flat cream or paper ground, never on plum or over a picture.
 */
export function ScrubClip({ name, w, h, frames = 61, fps = 12, ground = 'cream', className }: ScrubClipProps) {
  return (
    <div
      data-clip={`/art/loops/${name}`}
      data-frames={frames}
      data-fps={fps}
      aria-hidden="true"
      className={cx('scrub-clip pointer-events-none', GROUND[ground], className)}
      style={{ aspectRatio: `${w} / ${h}` }}
    />
  );
}
