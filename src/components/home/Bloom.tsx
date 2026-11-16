import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import { Container, FilmStage, Grid, Heading, PillarCard, Section } from '@/components/ui';

const PILLARS = ['economic', 'education', 'mentorship'] as const;

/**
 * S3 Bloom: the three pillars open with the lotus. The lotus film sticks (72svh square on the left from 1024; the
 * top 40svh under the nav pill below that, on an opaque cream backdrop so the cards pass beneath it, never
 * over it). The cards are a deck: where all three fit on screen the runtime sets data-deck="stack" and each
 * sticks with its title row showing while the next slides over it. Without that they simply follow on.
 */
export async function Bloom() {
  const t = await getTranslations('home.pillars');

  return (
    <Section tone="cream" from="paper" glow="blush" pad="none" id="pillars" labelledBy="pillars-title" thread="right">
      <Container>
        <Grid className="lg:items-start">
          <Heading id="pillars-title" className="col-span-full max-w-(--measure-heading) pt-section-sm lg:col-end-8">
            {t('heading')}
          </Heading>

          <div
            className={[
              'relative z-(--z-content) col-span-full -mx-gutter flex h-(--stage-phone-lotus) justify-center bg-cream px-gutter pt-(--nav-offset) pb-2',
              'motion-safe:[@media(min-height:37.5rem)]:sticky motion-safe:[@media(min-height:37.5rem)]:top-0',
              'after:absolute after:inset-x-0 after:top-full after:h-8 after:bg-linear-to-b after:from-cream after:to-transparent',
              'lg:col-start-1 lg:col-end-7 lg:row-start-2 lg:mx-0 lg:h-svh lg:items-center lg:justify-start lg:bg-transparent lg:px-0 lg:pb-8 lg:after:hidden',
            ].join(' ')}
          >
            {/* the stem runs out of the film's frame: fade it, so it does not end in a cut */}
            <FilmStage
              scene="lotus"
              className="aspect-square h-full max-w-full [mask-image:linear-gradient(to_bottom,black_88%,transparent)] lg:h-auto lg:w-full lg:max-w-[72svh]"
            />
          </div>

          <ul
            role="list"
            data-deck
            className={[
              'col-span-full flex flex-col gap-4 pt-6 pb-section-sm lg:pb-0 [--deck-top:calc(var(--stage-phone-lotus)+var(--space-2))]',
              'lg:col-start-7 lg:col-end-13 lg:row-start-2 lg:pt-(--nav-offset) lg:[--deck-top:calc(var(--nav-offset)+var(--space-4))]',
              // from 768 a card's padding and title line are taller than the phone's peek
              'md:[--deck-peek:5.5rem]',
            ].join(' ')}
          >
            {PILLARS.map((key, i) => (
              <li key={key} style={{ '--i': i } as CSSProperties}>
                <PillarCard title={t(`${key}.title`)} body={t(`${key}.body`)} />
              </li>
            ))}
          </ul>
        </Grid>
      </Container>
    </Section>
  );
}
