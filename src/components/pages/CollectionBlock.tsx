import {
  ButtonLink,
  Container,
  type FramePhoto,
  Grid,
  Heading,
  PhotoFrame,
  type ProductPhoto,
  ProductTile,
  Prose,
  Section,
  Todo,
} from '@/components/ui';
import { cx } from '@/lib/cx';
import { EMAIL, INSTAGRAM_URL } from '@/lib/site';

type Product = { name: string; photo?: ProductPhoto; alt: string };

export type CollectionBlockProps = {
  id: string;
  tone: 'cream' | 'paper';
  from: 'cream' | 'paper';
  name: string;
  body: string;
  credit: string;
  swatch?: FramePhoto;
  products: Product[];
  orderLabels: { instagram: string; email: string };
};

/** One collection: heading, copy, flat brocade swatch, products, order actions. No prices. */
export function CollectionBlock({ id, tone, from, name, body, credit, swatch, products, orderLabels }: CollectionBlockProps) {
  const titleId = `${id}-title`;
  const staggered = products.some((p) => p.photo);
  return (
    <Section tone={tone} from={from} pad="default" id={id} labelledBy={titleId}>
      <Container>
        <Grid>
          <Heading id={titleId} className="col-span-4 md:col-span-7 lg:col-span-7 lg:row-start-1">
            {name}
          </Heading>

          <div className="col-span-4 mt-6 md:col-span-7 lg:col-span-6 lg:row-start-2 lg:mt-8">
            <Prose variant="lead">{body}</Prose>
            <p className="mt-4 text-caption text-ink-soft">{credit}</p>
          </div>

          <PhotoFrame
            photo={swatch}
            ratio="4 / 5"
            sizes="(min-width: 1024px) 30vw, (min-width: 768px) 50vw, 90vw"
            className="col-span-4 mt-12 md:col-span-5 lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1 lg:mt-0"
          />

          {/* Three tiles in one row at 1280. The stagger is set on the children: ProductTile takes no className. */}
          <ul
            role="list"
            className={cx(
              'col-span-4 mt-16 grid grid-cols-1 gap-y-12 md:col-span-8 md:grid-cols-2 md:gap-x-gap lg:col-span-12 lg:row-start-3 lg:mt-24 lg:grid-cols-12 lg:gap-x-gap lg:*:col-span-4',
              staggered && 'md:[&>li:nth-child(2)]:mt-12 lg:[&>li:nth-child(3)]:mt-24',
            )}
          >
            {products.map((p) => (
              <ProductTile key={p.name} variant="full" name={p.name} photo={p.photo} alt={p.alt} />
            ))}
          </ul>

          <div className="col-span-4 mt-16 flex flex-col items-start gap-4 md:col-span-8 md:flex-row">
            <ButtonLink variant="primary" href={INSTAGRAM_URL}>
              {orderLabels.instagram}
            </ButtonLink>
            <ButtonLink variant="secondary" href={`mailto:${EMAIL}`}>
              {orderLabels.email}
            </ButtonLink>
            <Todo tag="shop" />
          </div>
        </Grid>
      </Container>
    </Section>
  );
}
