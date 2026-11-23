import { getTranslations } from 'next-intl/server';
import { Container, Grid, PhotoPrint, type PrintCrop, Section } from '@/components/ui';
import { photo } from '@/lib/photos';

// GIEO's own photographs of the two products, cropped to the product: the stall tables they were taken on
// also hold zip wallets, which GIEO does not show (CLAUDE.md), so every crop keeps them out of frame. Crops
// are fractions of the photo: [left, top, right, bottom].
const PRODUCT_PRINTS: { key: 'bag' | 'lipstick'; id: string; crop: PrintCrop }[] = [
  { key: 'bag', id: 'bag-pink', crop: [0.455, 0.08, 0.89, 0.56] },
  { key: 'lipstick', id: 'lipstick-on-bag', crop: [0.14, 0.36, 0.72, 0.9] },
];

/**
 * Collections, after the gallery: the products as made, in GIEO's own photographs. Two prints laid on the
 * gallery's plum, each named as the gallery names it (home.craft.products.<key>), a third, smaller print of the
 * cloth on the loom between them (from 1024), and the partner credit once. No heading: the gallery above has
 * introduced them. Nothing renders without the photos' consent and alt text.
 */
export async function AsMade() {
  const t = await getTranslations();
  const items = PRODUCT_PRINTS.flatMap(({ key, id, crop }) => {
    const p = photo(id, t);
    return p ? [{ key, crop, photo: p, name: t(`home.craft.products.${key}.name`), kind: t(`home.craft.products.${key}.kind`) }] : [];
  });
  if (items.length === 0) return null;
  const cloth = photo('nep-cloth', t);
  const [first, second] = items;

  const label = (item: (typeof items)[number]) => (
    <>
      <span lang="vi" className="block font-serif text-h4 italic text-fg-heading">
        {item.name}
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
            crop={first.crop}
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
              crop={second.crop}
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
