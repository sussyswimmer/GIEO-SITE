import { getTranslations } from 'next-intl/server';
import { Container, Grid, Hairline, Prose, Section } from '@/components/ui';
import { ArtLife } from './ArtLife';
import { fit, still } from './art';

/**
 * The product partner on /about: the section's heading small, the partner's name very large in italic (as
 * in the home page's Hands), its paragraph, and the products still beside it with the credit.
 */
export async function PartnerBlock({ heading, from = 'cream' }: { heading: string; from?: 'cream' | 'paper' }) {
  const t = await getTranslations('home.partner');
  const credit = (await getTranslations('collections.hmong'))('credit');
  const art = still('products');
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
            style={{ fontSize: fit(name, 0.44, '3.5rem', 'var(--fs-mega)') }}
          >
            {name}
          </h3>
          <Prose variant="lead" className="relative z-1 col-span-full mt-6 lg:col-end-7 lg:mt-10">
            {t('body')}
          </Prose>
          {art && (
            <ArtLife
              art={art}
              credit={credit}
              sizes="(min-width: 1024px) 45vw, 75vw"
              className="col-span-full -mr-gutter mt-6 ml-auto w-3/4 lg:col-start-7 lg:col-end-13 lg:-mt-20 lg:ml-0 lg:w-auto"
              // under 1024 the picture hangs off the right edge; its caption stays inside the text column
              creditClassName="mt-2 text-balance max-lg:mr-gutter lg:ml-[10%]"
            />
          )}
        </Grid>
      </Container>
    </Section>
  );
}
