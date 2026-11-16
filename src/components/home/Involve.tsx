import { getTranslations } from 'next-intl/server';
import { Container, Grid, Heading, InvolveCard, Section } from '@/components/ui';

/** S6. Three ways in, as large index rows across the full width. Links keep the locale via next-intl's Link. */
export async function Involve() {
  const t = await getTranslations('home.involve');

  return (
    <Section tone="paper" from="cream" pad="none" id="involve" labelledBy="involve-title" thread="right" className="pt-section-sm pb-10">
      <Container>
        <Grid>
          <Heading id="involve-title" className="col-span-full">
            {t('heading')}
          </Heading>

          <ul role="list" className="col-span-full mt-8 lg:mt-12">
            <InvolveCard href="/collections" label={t('shop.label')} todo="shop" />
            <InvolveCard href="/get-involved#mentor" label={t('mentor.label')} todo="mentor" />
            <InvolveCard href="/get-involved#partner" label={t('partner.label')} />
          </ul>
        </Grid>
      </Container>
    </Section>
  );
}
