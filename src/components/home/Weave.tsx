import { Fragment } from 'react';
import { getTranslations } from 'next-intl/server';
import { ButtonLink, Container, FilmStage, Grid, Prose, Section, ViWords } from '@/components/ui';
import { BandLine } from './KineticBand';

const BEAT = 'mt-10 motion-safe:lg:mt-[12svh]';
// The Nối Nếp collection, in the film's order (WEAVE_PRODUCTS in fallback-timeline.ts): the Nối Bag, the Nếp Keychain.
const PRODUCTS = ['bag', 'lipstick'] as const;

/**
 * S1 Weave: thread, cloth, product. The one dark section; every colour inside comes from the
 * [data-tone="plum"] scope. From 1024 the weave film sticks for the whole section on the right while three
 * beats scroll beside it; below that it sticks at the top, under the nav pill, and the copy scrolls beneath
 * its plum backdrop. The stage's size and bleed are the .weave-stage rule in globals.css: the canvas is
 * larger than the band it shows in, and every product stays inside the screen.
 * The quote is split on spaces for the scroll reveal; it stays one sentence for screen readers.
 * The section ends on the product run: the two names, large, each lit while its product rests on the stage
 * (docs/08 H2; the pacing is WEAVE_PACE in fallback-timeline.ts), each with what it is in small type under it,
 * then a band of the names running sideways.
 * No visible heading: there is no key for one (PLAN.md §6).
 */
export async function Weave() {
  const t = await getTranslations('home.craft');
  const tCollection = await getTranslations('collections.noinep');
  const words = t('quote').split(' ');

  return (
    <Section tone="plum" pad="none" id="craft" thread="right" className="overflow-clip">
      <Container>
        <Grid className="lg:items-start">
          <div
            // the seam (docs/08 H1): the page thread's runtime places the yarn's point in this box; its plum
            // backdrop ([data-seam], globals.css) starts there, so the thread shows running in above it
            data-seam
            className={[
              'relative z-(--z-content) col-span-full -mx-gutter h-(--stage-phone-weave) overflow-x-clip',
              'motion-safe:[@media(min-height:37.5rem)]:sticky motion-safe:[@media(min-height:37.5rem)]:top-0',
              // the copy fades out under the stage instead of being cut
              'after:absolute after:inset-x-0 after:top-full after:h-8 after:bg-linear-to-b after:from-plum-ink after:to-transparent',
              'lg:col-start-7 lg:col-end-13 lg:row-start-1 lg:ml-0 lg:h-svh lg:overflow-x-visible lg:bg-transparent lg:after:hidden',
            ].join(' ')}
          >
            <FilmStage scene="weave" className="weave-stage" />
            {/* The film shows the products, so the partner credit rides with it, under them (01-brand,
                docs/07 §1): in the stage, not the copy, or a product would be on screen without it. The
                runtime holds it back until the cloth starts to become one. */}
            <small data-credit className="absolute inset-x-0 bottom-2 px-2 text-center text-caption text-fg-body lg:bottom-6">
              {tCollection('credit')}
            </small>
          </div>

          {/* From 1024 the copy is above the stage: at 1280 the film's faded left edge reaches under it. */}
          <div className="col-span-full pt-6 lg:relative lg:z-(--z-content) lg:col-start-1 lg:col-end-7 lg:row-start-1 lg:pt-[12svh] xl:col-end-6">
            <p data-beat className="max-w-[34ch] font-serif text-h3 text-fg-heading">
              {t('beat1')}
            </p>

            <figure data-beat className={BEAT}>
              <blockquote
                className={[
                  // from 1280 the copy column is five columns wide: a smaller size keeps the sentence to seven lines
                  'relative text-balance font-serif text-quote italic text-fg-heading xl:text-[3.5rem]',
                  // decorative opening mark with empty alt text, so assistive tech reads only the quote
                  "before:mb-1 before:block before:text-[1.6em] before:leading-none before:text-lotus-pink before:content-['“'_/_'']",
                ].join(' ')}
              >
                {words.map((word, i) => (
                  <span key={i} data-word>
                    {i < words.length - 1 ? `${word} ` : word}
                  </span>
                ))}
              </blockquote>
            </figure>

            <Prose data-beat variant="lead" className={BEAT}>
              {t('beat3')}
            </Prose>

            {/* The product run (docs/08 H2). In flow this is a list of the two names. With the runtime up, on a
                screen tall enough, the names stick beside (below, on a phone) the stage for the length the
                runtime gives the run, and each is lit while its product rests on the stage. Their Vietnamese
                words carry lang="vi" (ViWords); what each product is sits under it in caption type,
                outside the outline effect (.weave-kind, globals.css). */}
            <div data-weave-run className={BEAT}>
              <div data-weave-names className="flex flex-col justify-center pb-section-sm lg:pt-(--nav-offset)">
                <p className="text-body font-medium text-fg-body">
                  <ViWords text={tCollection('name')} />
                </p>
                <ul role="list" className="weave-names mt-2 font-serif italic text-fg-heading lg:mt-4">
                  {PRODUCTS.map((id) => (
                    <li key={id}>
                      <span className="weave-name block">
                        <ViWords text={t(`products.${id}.name`)} />
                      </span>
                      <span className="weave-kind block font-sans text-caption not-italic text-fg-body">{t(`products.${id}.kind`)}</span>
                    </li>
                  ))}
                </ul>
                <ButtonLink variant="primary" href="/collections" className="mt-6 self-start lg:mt-10">
                  {t('cta')}
                </ButtonLink>
              </div>
            </div>
          </div>
        </Grid>
      </Container>
      {/* The second sideways band (docs/08 H2): the products, running against the pillar band below. Two
          names are a short line, so they run twice: the band stays wider than the screen all through its slide.
          The top padding is the stacked marks' room (Nối), clear of the partner credit above. */}
      <BandLine reverse className="pt-[0.2em] pb-6 text-fg-heading lg:pb-10" outline="var(--cream)">
        {[...PRODUCTS, ...PRODUCTS].map((id, i) => (
          <Fragment key={i}>
            <span>
              <ViWords text={t(`products.${id}.name`)} />
            </span>
            <span className="mx-[0.35em] not-italic text-lotus-pink">·</span>
          </Fragment>
        ))}
      </BandLine>
    </Section>
  );
}
