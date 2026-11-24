'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export type ViewerPhoto = {
  id: string;
  alt: string;
  width: number;
  height: number;
  src: string;
  variants: { w: number; avif: string; webp: string }[];
};

type PhotoViewerProps = {
  /** Matches `view.group` on the PhotoPrints this viewer opens. */
  group: string;
  photos: ViewerPhoto[];
  labels: { close: string; previous: string; next: string; count: string };
};

const SIZES = '(min-width: 1024px) 80vw, 94vw';
const SWIPE_PX = 48;
const srcSet = (p: ViewerPhoto, kind: 'avif' | 'webp') => p.variants.map((v) => `${v[kind]} ${v.w}w`).join(', ');

/**
 * Opens GIEO's photographs large, one at a time, from the PhotoPrints of one group (data-view-group): a native
 * modal <dialog>, so focus stays inside it, Esc closes it and the page behind is inert. Arrow buttons, the arrow
 * keys and a sideways swipe move through the group; a click outside the photo or the close button closes it, and
 * focus goes back to the print it was opened from. The page keeps its scroll position and does not move while it
 * is open. The reader opens it; nothing on the site opens it for them.
 *
 * It shows the photo, its alt text as the image's alt and "3 of 7". No caption: docs/09-feedback.md F3 allows
 * none on these photos.
 */
export function PhotoViewer({ group, photos, labels }: PhotoViewerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const count = photos.length;

  const step = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + count) % count)), [count]);

  // Prints are server-rendered buttons anywhere on the page; one listener finds those of this group.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const hit = (e.target as Element | null)?.closest<HTMLElement>(`[data-view-group="${group}"]`);
      if (!hit || !dialog.current) return;
      const i = Number(hit.dataset.view);
      if (!Number.isInteger(i) || i < 0 || i >= count) return;
      opener.current = hit;
      setIndex(i);
      // The page under a modal must not scroll (Lenis ignores the dialog: data-lenis-prevent).
      // The gutter stays, so a page with a visible scrollbar does not shift sideways under the dialog.
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.scrollbarGutter = 'stable';
      document.body.style.overflow = 'hidden';
      dialog.current.showModal();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [group, count]);

  // Fetch the neighbours' files ahead, at the size this screen will ask for.
  useEffect(() => {
    if (index === null || count < 2) return;
    for (const d of [1, -1]) {
      const p = photos[(index + d + count) % count];
      const img = new Image();
      img.sizes = SIZES;
      img.srcset = srcSet(p, 'webp');
    }
  }, [index, count, photos]);

  const onClose = () => {
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('scrollbar-gutter');
    document.body.style.removeProperty('overflow');
    setIndex(null);
    opener.current?.focus({ preventScroll: true });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else return;
    e.preventDefault();
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(e.clientY - s.y)) step(dx < 0 ? 1 : -1);
  };

  const photo = index === null ? null : photos[index];

  return (
    <dialog
      ref={dialog}
      className="viewer"
      aria-label={photo?.alt}
      data-lenis-prevent
      onClose={onClose}
      onKeyDown={onKeyDown}
      // A click on the dialog itself is a click outside the photo and the buttons.
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <button type="button" className="viewer-btn viewer-close" onClick={() => dialog.current?.close()} aria-label={labels.close}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      {count > 1 && (
        <button type="button" className="viewer-btn viewer-prev" onClick={() => step(-1)} aria-label={labels.previous}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      )}
      {photo && (
        <figure key={photo.id} className="viewer-print">
          <picture>
            <source type="image/avif" srcSet={srcSet(photo, 'avif')} sizes={SIZES} />
            <img src={photo.src} srcSet={srcSet(photo, 'webp')} sizes={SIZES} width={photo.width} height={photo.height} alt={photo.alt} decoding="async" />
          </picture>
        </figure>
      )}
      {count > 1 && (
        <button type="button" className="viewer-btn viewer-next" onClick={() => step(1)} aria-label={labels.next}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
      {index !== null && count > 1 && (
        <p className="viewer-count" aria-live="polite">
          {labels.count.replace('{n}', String(index + 1)).replace('{total}', String(count))}
        </p>
      )}
    </dialog>
  );
}
