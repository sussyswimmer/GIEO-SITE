import Image from 'next/image';
import { cx } from '@/lib/cx';
import { Todo } from './Todo';
import { Hairline } from './Typography';

/** Shape of a consented photo from src/lib/photos.ts (structural, so the manifest can change). */
export type ProductPhoto = { src: string; width: number; height: number; consent: boolean };

type ProductTileProps = {
  /** compact: name only, for the Craft section. full: image frame + name, for /collections. */
  variant?: 'compact' | 'full';
  name: string;
  /** full only. Ignored unless consent is true; the image frame is never rendered without it. */
  photo?: ProductPhoto;
  alt?: string;
};

/**
 * Product name tile. Never shows a price, and never a mock or generated product image.
 * Not interactive. Compact tiles take data-active (set by the weave scene's scroll triggers) while their product is on screen.
 */
export function ProductTile({ variant = 'compact', name, photo, alt }: ProductTileProps) {
  if (variant === 'compact') {
    return (
      <li className="group">
        <Hairline className="mb-3" />
        <span className="font-serif text-h3 font-medium text-fg-heading decoration-lotus-pink decoration-2 underline-offset-[0.2em] group-data-[active=true]:underline">
          {name}
        </span>
      </li>
    );
  }

  const hasPhoto = photo?.consent === true;
  return (
    <li className={hasPhoto ? undefined : 'border-t border-blush-line pt-3'}>
      {hasPhoto ? (
        <div className="relative aspect-[4/5] overflow-hidden rounded-frame bg-paper">
          <Image
            src={photo.src}
            alt={alt ?? ''}
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 90vw"
            className="object-cover"
          />
        </div>
      ) : (
        <Todo tag="products" block />
      )}
      <span className={cx('block font-serif text-h4 font-medium text-plum-ink', hasPhoto && 'mt-4')}>{name}</span>
    </li>
  );
}
