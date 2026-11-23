import { getTranslations } from 'next-intl/server';
import { Container, Grid, Hairline, PhotoFrame, Prose, Section } from '@/components/ui';
import { photo } from '@/lib/photos';
import { fit } from './art';

/**
 * The product partner on /about: the section's heading small, the partner's name very large in italic (as
 * in the home page's Hands), its paragraph, and GIEO's photograph of the bags beside it with the credit
 * (docs/09 F3).
 */
export async function PartnerBlock({ heading, from = 'cream' }: { heading: string; from?: 'cream' | 'paper' }) {
  const t = await getTranslations('home.partner');
  const tAll = await getTranslations();
  const bags = photo('bag-rows', tAll);
  const name = t('name');

  return (
    <Section tone="paper" from={from} pad="none" id="partner" labelledBy="partner-title" className="pt-section-sm pb-section-sm">
      <Container>
        <Grid className="items-start">
          <Hairline className="col-span-full mb-8 lg:mb-12" />
          <h2 id="partner-title" className="col-span-full font-serif text-h3 font-medium text-fg-heading">
            {heading}
          </h2>
          <h3
            lang="vi"
            className="relative z-1 col-span-full mt-2 font-serif text-mega italic text-fg-heading"
            style={{ fontSize: fit(name, 0.44, '3rem', 'var(--fs-mega)') }}
          >
            {name}
          </h3>
          <Prose variant="lead" className="relative z-1 col-span-full mt-6 lg:col-end-7 lg:mt-10">
            {t('body')}
          </Prose>
          <PhotoFrame
            photo={bags}
            ratio="16 / 9"
            sizes="(min-width: 1024px) 40vw, 92vw"
            caption={tAll('collections.noinep.credit')}
            className="col-span-full mt-6 lg:col-start-8 lg:col-end-13 lg:mt-10"
          />
        </Grid>
      </Container>
    </Section>
  );
}
