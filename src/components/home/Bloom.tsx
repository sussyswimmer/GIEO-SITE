import type { CSSProperties, ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { art } from '@/components/pages/art';
import { Container, FilmStage, Grid, Heading, PillarCard, ScrubClip, Section } from '@/components/ui';
import { StillLife } from './StillLife';

const PILLARS = ['economic', 'education', 'mentorship'] as const;
const OBJECT_SIZES = '(min-width: 1024px) 14vw, 36vw';

/**
 * S3 Bloom: the three pillars open with the lotus. The lotus film sticks (a square up to 86svh on the left
 * from 1024, larger than its column: its clear margins run off the screen and under the cards; the top 40svh
 * under the nav pill below that, on an opaque cream backdrop so the cards pass beneath it, never over it).
 * From 1024 the heading stands over the top of the stage and the deck starts beside it, so the first screen
 * already holds the heading, the bud and a card. The cards are a deck: where all three fit on screen the
 * runtime sets data-deck="stack" and each sticks with its title row showing while the next slides over it.
 * Without that they simply follow on. Each card carries one object for its pillar (docs/08 §2): decoration.
 */
export async function Bloom() {
  const t = await getTranslations('home.pillars');
  const object = (name: string) => {
    const a = art(`objects/${name}`);
    return a && <StillLife still={a} credit="" sizes={OBJECT_SIZES} />;
  };
  const objects: Record<(typeof PILLARS)[number], ReactNode> = {
    economic: object('basket'),
    // the books stand small in their frame: scaled to sit at the size of the other two objects
    education: <ScrubClip name="books" w={720} h={720} ground="paper" className="scale-130" />,
    mentorship: object('knot'),
  };

  return (
    <Section tone="cream" from="paper" glow="blush" pad="none" id="pillars" labelledBy="pillars-title" thread="right">
      <Container>
        <Grid className="lg:items-start">
          <Heading
            id="pillars-title"
            className="relative z-2 col-span-full max-w-(--measure-heading) pt-section-sm lg:col-end-7 lg:row-start-1"
          >
            {t('heading')}
          </Heading>

          <div
            className={[
              'relative z-(--z-content) col-span-full -mx-gutter flex h-(--stage-phone-lotus) justify-center bg-cream px-gutter pt-(--nav-offset) pb-2',
              'motion-safe:[@media(min-height:37.5rem)]:sticky motion-safe:[@media(min-height:37.5rem)]:top-0',
              'after:absolute after:inset-x-0 after:top-full after:h-8 after:bg-linear-to-b after:from-cream after:to-transparent',
              'lg:col-start-1 lg:col-end-6 lg:row-start-1 lg:row-end-3 lg:mx-0 lg:h-svh lg:items-end lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-[4svh] lg:after:hidden',
            ].join(' ')}
          >
            {/* the stem runs out of the film's frame: fade it, so it does not end in a cut */}
            <FilmStage
              scene="lotus"
              className="aspect-square h-full max-w-full [mask-image:linear-gradient(to_bottom,black_88%,transparent)] lg:h-auto lg:w-[min(86svh,58vw)] lg:max-w-none lg:shrink-0"
            />
          </div>

          <ul
            role="list"
            data-deck
            className={[
              'col-span-full flex flex-col gap-4 pt-6 pb-section-sm lg:pb-0 [--deck-top:calc(var(--stage-phone-lotus)+var(--space-2))]',
              // above the stage, which is wider than its column: the open lotus passes under the cards
              'lg:relative lg:z-(--z-content) lg:col-start-6 lg:col-end-13 lg:row-start-1 lg:row-end-3 lg:gap-6 lg:pt-section-sm lg:[--deck-top:calc(var(--nav-offset)+var(--space-4))]',
              // a stacked card keeps its padding and title line showing: taller from 768, and again from 1024
              'md:[--deck-peek:5.5rem] lg:[--deck-peek:6.5rem]',
            ].join(' ')}
          >
            {PILLARS.map((key, i) => (
              <li key={key} style={{ '--i': i } as CSSProperties}>
                <PillarCard title={t(`${key}.title`)} body={t(`${key}.body`)} art={objects[key]} />
              </li>
            ))}
          </ul>
        </Grid>
      </Container>
    </Section>
  );
}
