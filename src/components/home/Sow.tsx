import { Fragment } from 'react';
import { getTranslations } from 'next-intl/server';
import { ButtonLink, Container, FilmStage, Hairline, Section } from '@/components/ui';

/**
 * S0 Sow: the hero and the meaning of "gieo" in one pin (docs/07 §3, docs/08 H0 and H1). The first screen
 * is the vista: pale ridges behind the seed film (film-stage.ts draws both into one canvas), the headline
 * standing in front of them (live HTML text and the LCP element; the seed hangs in its last letters), then
 * one row with the sub line, the two ways in and the IB line, and a slim band of the word and its gloss.
 *
 * Once the motion runtime is up (html[data-motion="on"], globals.css) the screen sticks for the length of
 * [data-hero-run] and the three beats take turns inside the film's textSafe box, which the runtime sizes
 * from the manifest (--safe-x, --safe-y): they crossfade in place and never travel over the soil or the
 * sprout. In the last beat [data-hero-ground] lifts, the soil sinks into plum ([data-hero-sink]) and the
 * runtime draws roots into [data-hero-roots]: one of them is the page thread. Without JS, or with reduced
 * motion, nothing sticks, nothing sinks, and the same copy reads top to bottom under the first screen.
 * All copy here is ink or plum: it sits on a film.
 *
 * Beat type is sized to fit the box on a 375×667 phone in Vietnamese; the svh caps keep the dictionary
 * entry inside it on wide, short screens.
 */
export async function Sow() {
  const t = await getTranslations('home.hero');
  const m = await getTranslations('home.meaning');
  const nav = await getTranslations('nav');
  const craft = await getTranslations('home.craft');

  const band = Array.from({ length: 6 }, (_, i) => (
    <Fragment key={i}>
      <span lang="vi">{m('word')}</span>
      <span className="mx-[0.7em] not-italic text-lotus-pink">·</span>
      <span className="opacity-60">{m('gloss')}</span>
      <span className="mx-[0.7em] not-italic text-lotus-pink">·</span>
    </Fragment>
  ));

  return (
    <Section tone="cream" glow="dawn" glowClassName="bottom-auto h-svh" pad="none" id="hero" labelledBy="hero-title">
      <div data-hero-pin>
        <div data-hero-ground className="absolute inset-x-0 top-0 h-svh min-h-[34rem]">
          <FilmStage scene="seed" className="!absolute inset-0" />
          <div data-hero-sink aria-hidden="true" />
          <svg data-hero-roots data-ornament aria-hidden="true" />
        </div>

        <div className="relative flex h-svh min-h-[34rem] flex-col">
          <Container className="flex flex-1 flex-col pt-(--nav-offset)">
            <h1 id="hero-title" className="flex flex-col gap-2 lg:flex-1 lg:justify-between">
              <span
                data-hero-fade
                lang="en"
                className="word-in block max-w-[26ch] font-sans text-body font-medium text-ink [animation-delay:120ms] lg:max-w-none lg:text-lead lg:font-normal"
              >
                {t('eyebrow')}
              </span>
              <span data-hero-word className="word-in -ml-[0.04em] block font-serif text-hero whitespace-nowrap text-plum-ink">
                {t('headline')}
              </span>
            </h1>
            <div data-hero-fade className="mt-3 flex flex-1 flex-col justify-between gap-4 lg:mt-2 lg:flex-none lg:flex-row lg:items-end lg:gap-10">
              <p className="word-in max-w-[22ch] font-serif text-h3 italic text-plum-ink [animation-delay:200ms] lg:max-w-[30ch]">
                {t('sub')}
              </p>
              <div className="word-in flex flex-col gap-3 [animation-delay:280ms] lg:items-end">
                <p className="order-last flex items-center gap-3 text-caption font-medium text-ink lg:order-first">
                  <span aria-hidden="true" className="stitch hidden w-10 lg:block" />
                  {m('ibNote')}
                </p>
                <div className="flex flex-col gap-2 min-[26rem]:flex-row">
                  <ButtonLink variant="primary" href="/collections">
                    {craft('cta')}
                  </ButtonLink>
                  <ButtonLink variant="secondary" href="/get-involved" className="bg-(--cream-a86)">
                    {nav('getInvolved')}
                  </ButtonLink>
                </div>
              </div>
            </div>
          </Container>

          {/* The word and its gloss, running sideways. Decoration: both are read in the first beat below. */}
          <div data-hero-fade data-ornament aria-hidden="true" className="mt-4 overflow-x-clip pb-3 lg:mt-5 lg:pb-4">
            <Hairline />
            <p className="hero-band flex w-max pt-2 font-serif text-h4 whitespace-nowrap italic text-plum-ink lg:text-h3">
              <span>{band}</span>
              <span>{band}</span>
            </p>
          </div>
        </div>

        <Container>
          <div data-hero-beats>
            <article data-hero-beat aria-labelledby="meaning-title">
              <div className="flex flex-wrap items-baseline gap-x-4">
                <h2 id="meaning-title" lang="vi" className="font-serif text-[min(var(--fs-mega),20svh)] leading-(--lh-mega) italic text-plum-ink">
                  {m('word')}
                </h2>
                {/* Pronunciation in the sans face: the ɛ glyph is in neither web font (DESIGN.md §3). */}
                <span className="font-sans text-body text-ink">{m('pos')}</span>
                <span className="font-sans text-body text-ink">{m('pron')}</span>
              </div>
              <p className="font-serif text-[min(var(--fs-quote),8svh)] leading-(--lh-quote) text-plum-ink">{m('gloss')}</p>
            </article>

            <p data-hero-beat className="text-body text-ink lg:text-lead">
              {m('body')}
            </p>

            <div data-hero-beat>
              {/* 18 px on a 667-high phone, 20 px from about 740: the Vietnamese beat has to end above the soil */}
              <p className="font-serif text-[clamp(1.125rem,2.7svh,1.25rem)] leading-(--lh-h3) text-plum-ink lg:text-h3">{m('intro')}</p>
              {/* 4 px on a 667-high phone, more as the screen allows: tight against the type the stitch reads as an underline */}
              <Hairline className="my-[max(0.25rem,3svh_-_1rem)] max-w-40 lg:mt-6 lg:mb-4" />
              <p className="text-body font-medium text-ink">{m('ibNote')}</p>
            </div>
          </div>
        </Container>
      </div>
      {/* The pin's run: how long the screen holds while the film plays and the beats take their turns. */}
      <div data-hero-run aria-hidden="true" />
    </Section>
  );
}
