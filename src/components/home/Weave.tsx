import { getTranslations } from 'next-intl/server';
import { ButtonLink, Container, FilmStage, Grid, ProductTile, Prose, Section } from '@/components/ui';

const BEAT = 'mt-10 motion-safe:lg:mt-[12svh]';

/**
 * S1 Weave: thread, cloth, product. The one dark section; every colour inside comes from the
 * [data-tone="plum"] scope. From 1024 the weave film sticks for the whole section on the right while three
 * beats scroll beside it; below that it sticks at the top, under the nav pill, and the copy scrolls beneath
 * its plum backdrop. The stage's size and bleed are the .weave-stage rule in globals.css: the canvas is
 * larger than the band it shows in, and every product stays inside the screen.
 * The quote is split on spaces for the scroll reveal; it stays one sentence for screen readers.
 * No visible heading: there is no key for one (PLAN.md §6).
 */
export async function Weave() {
  const t = await getTranslations('home.craft');
  const tCollection = await getTranslations('collections.hmong');
  const words = t('quote').split(' ');

  return (
    <Section tone="plum" pad="none" id="craft" thread="right" className="overflow-clip">
      <Container>
        <Grid className="lg:items-start">
          <div
            className={[
              'relative z-(--z-content) col-span-full -mx-gutter h-(--stage-phone-weave) overflow-x-clip bg-plum-ink',
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
          <div className="col-span-full pt-6 pb-section-sm lg:relative lg:z-(--z-content) lg:col-start-1 lg:col-end-7 lg:row-start-1 lg:pt-[12svh] xl:col-end-6">
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

            <div data-beat className={BEAT}>
              <Prose>{t('beat3')}</Prose>
              <ul role="list" className="mt-8 flex flex-col gap-4">
                <ProductTile variant="compact" name={t('products.tote')} />
                <ProductTile variant="compact" name={t('products.mug')} />
                <ProductTile variant="compact" name={t('products.coaster')} />
              </ul>
              <ButtonLink variant="primary" href="/collections" className="mt-8">
                {t('cta')}
              </ButtonLink>
            </div>
          </div>
        </Grid>
      </Container>
    </Section>
  );
}
