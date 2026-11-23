import { getTranslations } from 'next-intl/server';
import { Container, Grid, Hairline, Heading, Prose, Section } from '@/components/ui';

const HEADING = 'italic xl:text-[clamp(3.75rem,5.3vw,5.25rem)]';
const PICTURE = 'absolute inset-0 size-full object-cover object-[74%_50%] lg:object-[62%_50%]';

/**
 * S4. Vision and mission as a full-bleed band on the dusk valley (docs/08 H3), inside the plum scope: every
 * colour of the copy comes from [data-tone="plum"]. The picture settles from 1.08 to 1 as the band crosses
 * the screen and mist drifts over it while it is in view (a muted loop; the still stays under reduced
 * motion). The copy keeps to the picture's calm, dark left on a plum scrim (.dusk-scrim in globals.css);
 * the glowing horizon and the lit terraces stay clear on the right. Under 1024 the horizon shows above the
 * copy instead. Side by side from 1280, stacked below that, with the stitched divider between them.
 * The picture is an illustration and states nothing; it is lazy, so it can never be the LCP element.
 */
export async function VisionMission() {
  const t = await getTranslations('home.visionMission');

  return (
    <Section tone="plum" pad="none" id="vision-mission" thread="right">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-clip">
        <div data-zoom className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- one sized WebP, drawn as the band's ground */}
          <img src="/art/vision/dusk.webp" alt="" loading="lazy" decoding="async" className={PICTURE} />
          <video data-loop data-src="/art/vision/dusk-mist.mp4" muted loop playsInline preload="none" className={PICTURE} />
        </div>
        <div className="dusk-scrim" />
      </div>

      <Container className="relative">
        <Grid className="pt-[13rem] pb-section-sm lg:py-section">
          <div className="relative col-span-full grid grid-cols-1 lg:col-end-10 xl:grid-cols-2">
            <article className="xl:pr-gap">
              <Heading className={HEADING}>{t('visionTitle')}</Heading>
              <Prose variant="lead" className="mt-4 font-normal lg:mt-6">
                {t('vision')}
              </Prose>
            </article>

            <Hairline className="my-8 lg:my-12 xl:hidden" />
            <Hairline vertical className="absolute inset-y-0 left-1/2 hidden xl:block" />

            <article className="xl:pl-gap">
              <Heading className={HEADING}>{t('missionTitle')}</Heading>
              <Prose variant="lead" className="mt-4 font-normal lg:mt-6">
                {t('mission')}
              </Prose>
            </article>
          </div>
        </Grid>
      </Container>
    </Section>
  );
}
