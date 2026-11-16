import { getTranslations } from 'next-intl/server';
import { Container, FilmStage, Hairline, Section } from '@/components/ui';

/**
 * S0 Sow: the hero and the meaning of "gieo" in one pin (docs/07 §3). The first screen holds the seed film
 * full-bleed and the headline, which is live HTML text and the LCP element; the word fits the content width
 * and the seed hangs in its last letters.
 *
 * Once the motion runtime is up (html[data-motion="on"], globals.css) the screen sticks for the length of
 * [data-hero-run] and the three beats take turns inside the film's textSafe box, which the runtime sizes
 * from the manifest (--safe-x, --safe-y): they crossfade in place and never travel over the soil or the
 * sprout. No scrim: the film is the point. Without JS, or with reduced motion, nothing sticks and the same
 * copy reads top to bottom under the first screen. All copy here is ink or plum: it sits on a film.
 *
 * Beat type is sized to fit the box on a 375×667 phone in Vietnamese; the svh caps keep the dictionary
 * entry inside it on wide, short screens.
 */
export async function Sow() {
  const t = await getTranslations('home.hero');
  const m = await getTranslations('home.meaning');

  return (
    <Section tone="cream" glow="dawn" glowClassName="bottom-auto h-svh" pad="none" id="hero" labelledBy="hero-title">
      <div data-hero-pin>
        <FilmStage scene="seed" className="!absolute inset-x-0 top-0 h-svh min-h-[34rem]" />
        <Container className="relative flex h-svh min-h-[34rem] flex-col pt-(--nav-offset) pb-6 lg:pb-8">
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
          <p
            data-hero-fade
            className="word-in mt-3 max-w-[22ch] font-serif text-h3 italic text-plum-ink [animation-delay:200ms] lg:mt-0 lg:max-w-[30ch]"
          >
            {t('sub')}
          </p>
        </Container>

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
