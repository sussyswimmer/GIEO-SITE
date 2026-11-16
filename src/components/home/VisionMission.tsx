import { getTranslations } from 'next-intl/server';
import { Container, Grid, Hairline, Heading, Prose, Section } from '@/components/ui';

/**
 * S4. Vision and mission, large headings, a stitched divider between them that sews in on entering view.
 * Side by side from 1280; stacked below that, because "Tầm nhìn" at h2 size does not fit a 5-column cell.
 */
export async function VisionMission() {
  const t = await getTranslations('home.visionMission');

  return (
    <Section tone="paper" from="cream" pad="none" id="vision-mission" thread="right" className="pt-8 pb-section-sm lg:pb-12">
      <Container>
        <Grid className="relative">
          <article className="col-span-full xl:col-start-1 xl:col-end-7 xl:pr-gap">
            <Heading>{t('visionTitle')}</Heading>
            <Prose variant="lead" className="mt-4 lg:mt-8">
              {t('vision')}
            </Prose>
          </article>

          <Hairline className="col-span-full my-8 lg:my-12 xl:hidden" />
          <Hairline vertical className="absolute inset-y-0 left-1/2 hidden xl:block" />

          <article className="col-span-full xl:col-start-7 xl:col-end-13 xl:pl-gap">
            <Heading>{t('missionTitle')}</Heading>
            <Prose variant="lead" className="mt-4 lg:mt-8">
              {t('mission')}
            </Prose>
          </article>
        </Grid>
      </Container>
    </Section>
  );
}
