import { getTranslations } from 'next-intl/server';
import { Container, Grid, Hairline, Prose, Section } from '@/components/ui';

type PartnerProps = {
  /** On /about: rendered as the section's h2, and the partner name drops to an h3. */
  heading?: string;
  from?: 'cream' | 'paper';
};

/** H3. The product partner credit. Also used on /about with a heading and from="cream". */
export async function Partner({ heading, from = 'paper' }: PartnerProps) {
  const t = await getTranslations('home.partner');
  const NameTag = heading ? 'h3' : 'h2';

  return (
    <Section tone="paper" from={from} pad="sm" id="partner" labelledBy="partner-title">
      <Container>
        <Grid>
          <Hairline className="col-span-4 mb-12 md:col-span-8 lg:col-span-12 lg:mb-16" />

          {heading && (
            <h2 id="partner-title" className="col-span-4 mb-12 font-serif text-h2 text-plum-ink md:col-span-8 lg:col-span-12">
              {heading}
            </h2>
          )}

          <NameTag
            id={heading ? undefined : 'partner-title'}
            className="col-span-4 font-serif text-h3 font-medium text-plum-ink md:col-span-8 lg:col-span-4"
          >
            {t('name')}
          </NameTag>

          <Prose variant="lead" className="col-span-4 mt-6 md:col-span-7 lg:col-start-6 lg:col-end-12 lg:mt-0">
            {t('body')}
          </Prose>
        </Grid>
      </Container>
    </Section>
  );
}
