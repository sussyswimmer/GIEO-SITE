import Image from 'next/image';
import {
  ButtonLink,
  Container,
  type FramePhoto,
  Grid,
  PhotoFrame,
  type ProductPhoto,
  Prose,
  Section,
  Todo,
} from '@/components/ui';
import { cx } from '@/lib/cx';
import { EMAIL, INSTAGRAM_URL } from '@/lib/site';
import { ArtLife } from './ArtLife';
import { type Art, fit } from './art';

type Product = {
  name: string;
  /** A Blender render of this product on a transparent ground, made to sit on plum. */
  render: string;
  /** GIEO's own consented photo; replaces the render when it arrives. */
  photo?: ProductPhoto;
  alt: string;
};

export type CollectionBlockProps = {
  id: string;
  tone: 'cream' | 'paper';
  from: 'cream' | 'paper';
  name: string;
  body: string;
  credit: string;
  swatch?: FramePhoto;
  /** A decorative picture beside the copy. */
  art?: Art;
  products: Product[];
  orderLabels: { instagram: string; email: string };
};

/**
 * One product, as a wide plum tile that unveils on entering view: the picture on a soft glow on one half,
 * the name on the other (sides alternate from 1024), the partner credit with it. Not interactive, no price.
 */
function ProductSlab({ product, credit, flip }: { product: Product; credit: string; flip: boolean }) {
  const { name, render, photo, alt } = product;
  return (
    <li data-tone="plum" data-enter className="grid overflow-hidden rounded-card bg-plum-ink lg:grid-cols-2">
      <div
        className={cx('relative aspect-square lg:aspect-auto lg:h-[min(36rem,72svh)]', flip && 'lg:order-2')}
        style={{ backgroundImage: 'var(--still-loom)' }}
      >
        {photo?.consent ? (
          <Image src={photo.src} alt={alt} fill sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover" />
        ) : (
          // The name beside it says what this is, so the render itself is decoration.
          <Image src={render} alt="" fill unoptimized sizes="(min-width: 1024px) 45vw, 90vw" data-drift="3" className="object-contain p-[4%]" />
        )}
      </div>
      <div className="flex flex-col justify-center gap-4 p-6 md:p-10 lg:gap-6 lg:p-16">
        <h3 className="font-serif text-h2 text-fg-heading">{name}</h3>
        <small className="block text-caption text-fg-body">{credit}</small>
      </div>
    </li>
  );
}

/** One collection: its name very large, the copy, the products as large tiles, then how to order. No prices. */
export function CollectionBlock({ id, tone, from, name, body, credit, swatch, art, products, orderLabels }: CollectionBlockProps) {
  const titleId = `${id}-title`;
  return (
    <Section tone={tone} from={from} pad="none" id={id} labelledBy={titleId} className="pt-section-sm pb-6 lg:pb-8">
      <Container>
        <Grid className="items-center">
          <h2
            id={titleId}
            className="relative z-1 col-span-full font-serif text-mega italic text-fg-heading"
            style={{ fontSize: fit(name, 0.5, '3.5rem', 'var(--fs-mega)') }}
          >
            {name}
          </h2>
          <div className="relative z-1 col-span-full mt-4 md:col-span-5 lg:col-span-6 lg:mt-6">
            <Prose variant="lead">{body}</Prose>
            <small className="mt-4 block text-caption text-fg-body">{credit}</small>
          </div>
          {art && (
            <ArtLife
              art={art}
              sizes="(min-width: 1024px) 34vw, (min-width: 768px) 40vw, 70vw"
              className="col-span-full mt-4 ml-auto w-[70%] md:col-span-3 md:-mt-10 md:w-auto lg:col-start-8 lg:col-end-12 lg:-mt-24"
            />
          )}

          <PhotoFrame
            photo={swatch}
            ratio="16 / 9"
            sizes="(min-width: 1024px) 60vw, 90vw"
            className="col-span-full mt-8 lg:col-span-8"
          />
        </Grid>

        <ul role="list" className="mt-8 flex flex-col gap-4 lg:mt-12 lg:gap-6">
          {products.map((p, i) => (
            <ProductSlab key={p.name} product={p} credit={credit} flip={i % 2 === 1} />
          ))}
        </ul>

        <div className="mt-8 flex flex-col items-start gap-4 md:flex-row lg:mt-12">
          <ButtonLink variant="primary" href={INSTAGRAM_URL}>
            {orderLabels.instagram}
          </ButtonLink>
          <ButtonLink variant="secondary" href={`mailto:${EMAIL}`}>
            {orderLabels.email}
          </ButtonLink>
          <Todo tag="shop" />
        </div>
      </Container>
    </Section>
  );
}
