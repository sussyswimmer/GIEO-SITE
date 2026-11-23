import Image from 'next/image';
import { type CSSProperties, Fragment } from 'react';
import { ButtonLink, type FramePhoto, type ProductPhoto, Prose, Section, Todo } from '@/components/ui';
import type { ProductKey } from '@/lib/showroom';
import { EMAIL, INSTAGRAM_URL } from '@/lib/site';
import type { Art } from './art';
import { ShowroomDriver } from './ShowroomDriver';

export type ShowroomProduct = {
  key: ProductKey;
  /** home.craft.products.<key>.name */
  name: string;
  /** What it is (home.craft.products.<key>.kind), set small under the name. */
  kind: string;
  /** A Blender render of this product on a transparent ground, made to sit on plum (none if not rendered). */
  render?: string;
  /** GIEO's own consented photo; replaces the render when it arrives. */
  photo?: ProductPhoto;
  alt: string;
};

type ShowroomProps = {
  /** The collection (collections.noinep.*). */
  name: string;
  tagline?: string;
  body: string;
  credit: string;
  /** The cloth still for the intro, or GIEO's consented brocade photo. */
  cloth?: Art;
  swatch?: FramePhoto;
  products: ShowroomProduct[];
  orderLabels: { instagram: string; email: string };
};

const SIZES = '(min-width: 1024px) 50vw, 90vw';

/**
 * A name set letter by letter, so each letter can rise in on its own as the product arrives (--i is the
 * letter's place; globals.css staggers by it). Words never break; screen readers get the name whole.
 */
function Letters({ text }: { text: string }) {
  let i = 0;
  const words = text.split(' ');
  return words.map((word, w) => (
    <Fragment key={w}>
      <span aria-hidden="true" className="showroom-word">
        {[...word].map((ch) => (
          <span key={i} className="showroom-letter" style={{ '--i': i++ } as CSSProperties}>
            {ch}
          </span>
        ))}
      </span>
      {w < words.length - 1 && ' '}
    </Fragment>
  ));
}

/** A product's picture: GIEO's photo when consented, otherwise its render (decorative: the name says what it is). */
function ProductPicture({ product }: { product: ShowroomProduct }) {
  const { photo, render, alt } = product;
  if (photo?.consent) return <Image src={photo.src} alt={alt} fill sizes={SIZES} className="rounded-card object-cover" />;
  return render ? <Image src={render} alt="" fill unoptimized sizes={SIZES} className="object-contain p-[6%]" /> : null;
}

/**
 * The Collections gallery track (globals.css "Collections track", src/lib/showroom.ts). One row: the
 * collection's intro (Nối Nếp), its two products (the Nối Bag, the Nếp Keychain), how to order. With motion
 * the run pins and scrolling down slides the row left (ShowroomDriver); ShowroomScene hangs each product in
 * the air in its box, turning, and it glides out as the next glides in. Each box holds the product's picture
 * for when there is no 3D canvas. Without motion or JS: a plain list, top to bottom.
 */
export function Showroom({ name, tagline, body, credit, cloth, swatch, products, orderLabels }: ShowroomProps) {
  const titleId = 'noinep-title';
  const clothPicture = swatch?.src ? (
    <Image src={swatch.src} alt={swatch.alt} fill sizes={SIZES} className="rounded-card object-cover" />
  ) : cloth ? (
    <Image src={cloth.src} alt="" fill unoptimized sizes={SIZES} className="object-contain" />
  ) : undefined;

  return (
    <Section tone="plum" pad="none" id="noinep" labelledBy={titleId}>
      {/* The pinned run's length is set in globals.css (runLength(2), src/lib/showroom.ts). */}
      <div data-showroom-run data-scene-stage="showroom" className="showroom-run">
        <div className="showroom-pin">
          <ul role="list" data-showroom-track className="showroom-track">
            <li data-showroom-slot="intro" className="showroom-slot showroom-intro">
              <h2 id={titleId} className="showroom-title font-serif italic text-fg-heading">
                {name}
              </h2>
              {tagline && <p className="mt-3 max-w-[30ch] font-serif text-h4 italic text-fg-heading">{tagline}</p>}
              <Prose variant="lead" className="mt-5 max-w-[30ch]">
                {body}
              </Prose>
              <small className="mt-3 block text-caption text-fg-body">{credit}</small>
              {clothPicture && <div className="showroom-cloth relative mt-8">{clothPicture}</div>}
            </li>

            {products.map((p) => (
              <li key={p.key} data-showroom-slot={p.key} className="showroom-slot showroom-product">
                <h3
                  aria-label={p.kind ? `${p.name}, ${p.kind}` : p.name}
                  className="showroom-name font-serif italic text-balance text-fg-heading"
                >
                  <Letters text={p.name} />
                  {p.kind && (
                    // What it is, small under the name, arriving with the name's last letters (--f).
                    <small
                      aria-hidden="true"
                      className="mt-3 block font-sans text-caption not-italic text-fg-body"
                      style={{ opacity: 'clamp(0, calc(var(--f, 1) * 1.7 - 0.5), 1)' }}
                    >
                      {p.kind}
                    </small>
                  )}
                </h3>
                <div data-showroom-stage={p.key} className="showroom-box">
                  <div className="showroom-still">
                    <ProductPicture product={p} />
                  </div>
                </div>
              </li>
            ))}

            <li data-showroom-slot="order" className="showroom-slot showroom-order">
              <div className="flex flex-col items-start gap-4">
                <ButtonLink variant="primary" href={INSTAGRAM_URL}>
                  {orderLabels.instagram}
                </ButtonLink>
                <ButtonLink variant="secondary" href={`mailto:${EMAIL}`}>
                  {orderLabels.email}
                </ButtonLink>
                <Todo tag="shop" />
              </div>
            </li>
          </ul>
          {/* The partner credit rides with the products while they are on screen (a visual repeat of the
              one in the intro, so screen readers hear it once). */}
          <small aria-hidden="true" className="showroom-credit text-caption text-fg-body">
            {credit}
          </small>
        </div>
      </div>
      <ShowroomDriver />
    </Section>
  );
}
