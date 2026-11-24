import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import { cx } from '@/lib/cx';
import type { FramePhoto } from './PhotoFrame';
import { Todo } from './Todo';

type PhotoPrintProps = {
  photo: FramePhoto | undefined;
  /** How wide the print is drawn (a next/image sizes string). */
  sizes: string;
  /** CSS aspect ratio of the picture, e.g. '4 / 5'; the photo's own by default. */
  ratio?: string;
  /** object-position of the picture in its window. */
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
  /**
   * Makes the print open in a PhotoViewer: `group` names the viewer, `index` is this photo's place in its list,
   * `label` the button's verb ("Open photo"), read before the photo's alt text.
   */
  view?: { group: string; index: number; label: string };
};

const DRIFT = 3; // % of the picture's height each way, as the still-lifes' back layer (docs/08 H3)
const OVERHANG = 4; // % the picture layer reaches past the window above and below: more than DRIFT, so no edge shows

/**
 * One of GIEO's photographs, laid on the page as a small printed photograph: an object, like the still-lifes,
 * not a frame in a grid. A thin cream mat, softly rounded corners, a soft shadow, a slight tilt; it settles in
 * as it enters view (data-enter: a fade and a small turn, globals.css "photo prints") and the picture drifts
 * inside its window as the page scrolls (data-drift). Without JS, or with reduced motion, it simply lies there.
 *
 * Consent-gated like PhotoFrame: without `consent === true` and alt text it renders nothing in production (in
 * dev, an empty print marked TODO). The alt text says what is visible, nothing more; the caption is separate.
 *
 * The browser always receives the whole photo file, so a print is never a way to hide part of one: `ratio` and
 * `focus` only frame it. Anything that must not be published is cut out of the file itself
 * (assets/photos/SOURCES.md).
 */
export function PhotoPrint({
  photo,
  sizes,
  ratio,
  focus,
  tilt = 0,
  glow,
  tone = 'light',
  caption,
  className,
  captionClassName,
  style,
  view,
}: PhotoPrintProps) {
  const shown = photo?.consent === true && !!photo.alt;
  if (!shown && process.env.NODE_ENV === 'production') return null;

  const vars = { ...style, '--tilt': `${tilt}deg` } as CSSProperties;
  const aspect = ratio ?? (photo ? `${photo.width} / ${photo.height}` : '4 / 5');

  // The picture layer overhangs the window a little above and below, so it has room to drift without showing an
  // edge.
  const layer: CSSProperties = { left: 0, right: 0, top: `-${OVERHANG}%`, bottom: `-${OVERHANG}%` };

  return (
    <figure data-tone={tone} className={cx('print', className)} style={vars}>
      {glow && <div aria-hidden="true" className="print-glow" />}
      <div data-enter className="print-sheet">
        <div className="print-window" style={{ aspectRatio: aspect }}>
          {shown && photo ? (
            <div className="absolute" style={layer} data-drift={DRIFT}>
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes={sizes}
                className="object-cover"
                style={focus ? { objectPosition: focus } : undefined}
                {...(photo.blurDataURL ? { placeholder: 'blur' as const, blurDataURL: photo.blurDataURL } : {})}
              />
            </div>
          ) : (
            <div className="flex size-full items-center justify-center">
              <Todo tag="photos" />
            </div>
          )}
        </div>
        {/* Over the whole mat and inside it, so it turns with the print and its focus ring follows the tilt. */}
        {view && shown && photo && (
          <button
            type="button"
            className="print-hit"
            data-view-group={view.group}
            data-view={view.index}
            aria-haspopup="dialog"
            aria-label={`${view.label}: ${photo.alt}`}
          />
        )}
      </div>
      {caption && <figcaption className={cx('print-cap', captionClassName)}>{caption}</figcaption>}
    </figure>
  );
}
