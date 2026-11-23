import { getTranslations } from 'next-intl/server';
import { Container, Grid, PhotoPrint, Section, ViWords } from '@/components/ui';
import { photo } from '@/lib/photos';

// GIEO's own photographs of the two products. The stall tables they were taken on also hold wallets and printed
// sheets, which GIEO does not show (docs/09-feedback.md F2), so each file in assets/photos/products/ is already
// cut to the product (assets/photos/SOURCES.md): nothing else is in the file, so nothing else is published. Each
// print takes its photo's own proportions.
const PRODUCT_PRINTS: { key: 'bag' | 'lipstick'; id: string }[] = [
  { key: 'bag', id: 'bag-pink' },
  { key: 'lipstick', id: 'lipstick-on-bag' },
];

/**
 * Collections, after the gallery: the products as made, in GIEO's own photographs. Two prints laid on the
 * gallery's plum, each named as the gallery names it (home.craft.products.<key>), a third, smaller print of the
 * cloth on the loom between them (from 1024), and the partner credit once. No heading: the gallery above has
 * introduced them. Nothing renders without the photos' consent and alt text.
 */
export async function AsMade() {
  const t = await getTranslations();
  const items = PRODUCT_PRINTS.flatMap(({ key, id }) => {
    const p = photo(id, t);
    return p ? [{ key, photo: p, name: t(`home.craft.products.${key}.name`), kind: t(`home.craft.products.${key}.kind`) }] : [];
  });
  if (items.length === 0) return null;
  const cloth = photo('nep-cloth', t);
  const [first, second] = items;

  const label = (item: (typeof items)[number]) => (
    <>
      <span className="block font-serif text-h4 italic text-fg-heading">
        <ViWords text={item.name} />
      </span>
      <span className="mt-1 block text-caption text-fg-body">{item.kind}</span>
    </>
  );

  return (
    <Section as="div" tone="plum" from="plum" pad="none" className="overflow-x-clip pt-section-sm pb-section">
      <Container>
        <Grid className="items-start">
          <PhotoPrint
            photo={first.photo}
            tilt={-2}
            glow
            tone="plum"
            sizes="(min-width: 1024px) 31vw, (min-width: 768px) 46vw, 78vw"
            caption={label(first)}
            captionClassName="pl-[4%]"
            className="col-span-4 w-[84%] md:col-start-1 md:col-end-5 md:w-full lg:col-start-1 lg:col-end-6 lg:w-[88%] lg:justify-self-end"
          />
          {cloth && (
            <PhotoPrint
              photo={cloth}
              ratio="4 / 5"
              focus="50% 60%"
              tilt={3}
              tone="plum"
              sizes="13vw"
              className="hidden lg:col-start-6 lg:col-end-8 lg:row-start-1 lg:mt-40 lg:block lg:w-[86%] lg:justify-self-center"
            />
          )}
          {second && (
            <PhotoPrint
              photo={second.photo}
              tilt={2}
              glow
              tone="plum"
              sizes="(min-width: 1024px) 28vw, (min-width: 768px) 30vw, 72vw"
              caption={label(second)}
              captionClassName="pl-[4%]"
              className="col-span-4 mt-8 ml-auto w-[76%] md:col-start-5 md:col-end-9 md:row-start-1 md:mt-20 md:w-[92%] lg:col-start-8 lg:col-end-12 lg:mt-12 lg:ml-0 lg:w-full"
            />
          )}
          <small className="col-span-full mt-8 block text-caption text-fg-body md:mt-10 lg:col-start-8 lg:col-end-12 lg:pl-[1%]">
            {t('collections.noinep.credit')}
          </small>
        </Grid>
      </Container>
    </Section>
  );
}
