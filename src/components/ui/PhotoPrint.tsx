import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import { cx } from '@/lib/cx';
import type { FramePhoto } from './PhotoFrame';
import { Todo } from './Todo';

/** The part of the photo to show, in fractions of its width and height: [left, top, right, bottom]. */
export type PrintCrop = readonly [x0: number, y0: number, x1: number, y1: number];

type PhotoPrintProps = {
  photo: FramePhoto | undefined;
  /** How wide the print is drawn (a next/image sizes string). A crop's wider image is worked out from it. */
  sizes: string;
  /** Show only this part of the photo; the print takes its proportions. Use it to keep things out of frame. */
  crop?: PrintCrop;
  /** CSS aspect ratio of the picture when there is no crop, e.g. '4 / 5'; the photo's own by default. */
  ratio?: string;
  /** object-position when there is no crop. */
  focus?: string;
  /** Degrees, -3 to 3: a print laid down by hand is never quite square. */
  tilt?: number;
  /** A petal glow behind the print, like the one behind the still-lifes. */
  glow?: boolean;
  /** The section's tone: on plum the shadow is deeper and the glow is the loom's pink. */
  tone?: 'light' | 'plum';
  /** Under the print, upright: a product's name and kind, or the partner credit. */
  caption?: ReactNode;
  className?: string;
  captionClassName?: string;
  style?: CSSProperties;
};

const DRIFT = 3; // % of the picture's height each way, as the still-lifes' back layer (docs/08 H3)

/** Scales every width in a simple sizes string ('(min-width: 1024px) 14vw, 40vw') by k. */
function scaleSizes(sizes: string, k: number) {
  if (k === 1) return sizes;
  return sizes
    .split(',')
    .map((part) => part.replace(/(\d+(?:\.\d+)?)(vw|px)\s*$/, (_, n: string, unit: string) => `${Math.round(Number(n) * k * 10) / 10}${unit}`))
    .join(',');
}

/**
 * One of GIEO's photographs, laid on the page as a small printed photograph: an object, like the still-lifes,
 * not a frame in a grid. A thin cream mat, softly rounded corners, a soft shadow, a slight tilt; it settles in
 * as it enters view (data-enter: a fade and a small turn, globals.css "photo prints") and the picture drifts
 * inside its window as the page scrolls (data-drift). Without JS, or with reduced motion, it simply lies there.
 *
 * Consent-gated like PhotoFrame: without `consent === true` and alt text it renders nothing in production (in
 * dev, an empty print marked TODO). The alt text says what is visible, nothing more; the caption is separate.
 */
export function PhotoPrint({
  photo,
  sizes,
  crop,
  ratio,
  focus,
  tilt = 0,
  glow,
  tone = 'light',
  caption,
  className,
  captionClassName,
  style,
}: PhotoPrintProps) {
  const shown = photo?.consent === true && !!photo.alt;
  if (!shown && process.env.NODE_ENV === 'production') return null;

  const vars = { ...style, '--tilt': `${tilt}deg` } as CSSProperties;
  const [x0, y0, x1, y1] = crop ?? [0, 0, 1, 1];
  const cw = x1 - x0;
  const ch = y1 - y0;
  const aspect = crop && photo ? `${Math.round(cw * photo.width)} / ${Math.round(ch * photo.height)}` : (ratio ?? (photo ? `${photo.width} / ${photo.height}` : '4 / 5'));

  // The picture layer: with a crop it is the whole photo, placed so the crop fills the window; without one it
  // overhangs the window a little above and below. Either way it has room to drift without showing an edge.
  const room = crop ? (100 * Math.min(y0, 1 - y1)) / ch : 4;
  const drift = Math.min(DRIFT, Math.floor(room * 10) / 10);
  const layer: CSSProperties = crop
    ? { left: `${(-x0 / cw) * 100}%`, top: `${(-y0 / ch) * 100}%`, width: `${100 / cw}%`, height: `${100 / ch}%` }
    : { left: 0, right: 0, top: '-4%', bottom: '-4%' };

  return (
    <figure data-tone={tone} className={cx('print', className)} style={vars}>
      {glow && <div aria-hidden="true" className="print-glow" />}
      <div data-enter className="print-sheet">
        <div className="print-window" style={{ aspectRatio: aspect }}>
          {shown && photo ? (
            <div className="absolute" style={layer} {...(drift >= 0.5 ? { 'data-drift': drift } : {})}>
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes={scaleSizes(sizes, 1 / cw)}
                className="object-cover"
                style={!crop && focus ? { objectPosition: focus } : undefined}
                {...(photo.blurDataURL ? { placeholder: 'blur' as const, blurDataURL: photo.blurDataURL } : {})}
              />
            </div>
          ) : (
            <div className="flex size-full items-center justify-center">
              <Todo tag="photos" />
            </div>
          )}
        </div>
      </div>
      {caption && <figcaption className={cx('print-cap', captionClassName)}>{caption}</figcaption>}
    </figure>
  );
}
