import { getTranslations } from 'next-intl/server';
import { Container, Grid, Prose, Section } from '@/components/ui';
import { HOME_STILLS, listStills } from '@/lib/stills';
import { StillLife } from './StillLife';

/**
 * S2 Hands: who makes the products, and who the work is for (the old Partner and NextGen sections).
 * The partner's name is set very large, with the products still standing beside it (the credit under it)
 * and the partner paragraph under the name. Below, the cloth still sits beside the paragraph on the next
 * generation. Both stills are large and bleed past the gutters; the block reads complete without them.
 */
export async function Hands() {
  const t = await getTranslations('home.partner');
  const n = await getTranslations('home.nextGen');
  const credit = (await getTranslations('collections.hmong'))('credit');
  const [products, cloth] = listStills(HOME_STILLS);

  return (
    <Section tone="paper" pad="none" id="partner" labelledBy="partner-title" thread="right" className="pt-section-sm pb-section-sm">
      <Container>
        <Grid className="items-start lg:grid-rows-[auto_1fr_auto]">
          <h2
            id="partner-title"
            lang="vi"
            className="relative z-1 col-span-full font-serif text-mega italic text-fg-heading lg:col-start-1 lg:col-end-9 lg:row-start-1"
          >
            {t('name')}
          </h2>
          {products && (
            <StillLife
              still={products}
              credit={credit}
              sizes="(min-width: 1024px) 45vw, 70vw"
              className="col-span-full -mr-gutter mt-4 ml-auto w-2/3 lg:col-start-8 lg:col-end-13 lg:row-start-1 lg:row-end-3 lg:mt-0 lg:ml-0 lg:w-auto"
              creditClassName="mt-2 lg:ml-[10%]"
            />
          )}
          <Prose className="relative z-1 col-span-full mt-6 lg:col-start-1 lg:col-end-6 lg:row-start-2 lg:mt-8">{t('body')}</Prose>

          {cloth && (
            <StillLife
              still={cloth}
              credit={credit}
              index={1}
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="col-span-full -ml-gutter mt-8 w-[85%] lg:w-auto lg:col-start-1 lg:col-end-7 lg:row-start-3 lg:mt-4"
            />
          )}
          <Prose
            id="next-gen"
            variant="lead"
            className="relative z-1 col-span-full mt-6 lg:col-start-7 lg:col-end-13 lg:row-start-3 lg:mt-0 lg:self-center"
          >
            {n('body')}
          </Prose>
        </Grid>
      </Container>
    </Section>
  );
}
