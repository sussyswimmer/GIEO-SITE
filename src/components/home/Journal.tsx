import { getTranslations } from 'next-intl/server';
import { Container, Grid, Heading, PhotoFrame, Prose, Section, Todo } from '@/components/ui';
import { journalPhotos, withAlt } from '@/lib/photos';

const SIZES = '(min-width: 1024px) 36vw, (min-width: 768px) 30vw, 46vw';

// Six-photo module for GIEO's own photos. Index i uses slot i % 6; ratio (--r) and placement come from the
// same slot. Two rows of three from 768, each frame a step off its neighbour, so the six read as a loose
// contact sheet and the section stays near a screen and a half at 1440×900 (docs/09 F1: the page gets
// shorter). Under 768 they stand two to a row, the right one a step lower.
const SLOT = [
  'col-span-2 [--r:3/4] lg:col-start-1 lg:col-end-4 lg:[--r:4/5]',
  'col-span-2 [--r:1/1] max-md:mt-8 md:max-lg:mt-8 lg:col-start-4 lg:col-end-9 lg:mt-10 lg:[--r:3/2]',
  'col-span-2 [--r:1/1] lg:col-start-9 lg:col-end-13 lg:mt-20 lg:[--r:4/3]',
  'col-span-2 [--r:4/5] max-md:mt-8 lg:col-start-2 lg:col-end-5',
  'col-span-2 [--r:3/4] md:max-lg:mt-8 lg:col-start-5 lg:col-end-8 lg:mt-12',
  'col-span-2 [--r:1/1] max-md:mt-8 lg:col-start-8 lg:col-end-13 lg:mt-6 lg:[--r:3/2]',
] as const;

/**
 * S5. GIEO's season: GIEO's own photographs in a loose grid (docs/09 F3; it replaces the rail of stills), on
 * a horizon of pale ridges behind the heading (docs/08 H3). Only frames in which nobody can be recognised,
 * each with consent and alt text. No captions: the alt text says what is visible and nothing else.
 */
export async function Journal() {
  const t = await getTranslations('home.journal');
  const tAll = await getTranslations();

  // Alt text is the content key photos.<id>.alt; a photo without it is not shown (PLAN.md §5, §6).
  const photos = journalPhotos.flatMap((p) => withAlt(p, tAll) ?? []);
  const closing = t('closing');

  return (
    <Section tone="cream" pad="none" id="journal" labelledBy="journal-title" thread="right" className="pt-section-sm pb-section-sm lg:pb-10">
      {/* A horizon behind the heading and the first photographs: an illustration on the section's own cream, eased out at
          its top and bottom so it has no edge. Lazy, so it can never be the LCP element. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- one sized WebP, drawn as the section's ground */}
      <img
        src="/art/bands/ridges.webp"
        alt=""
        aria-hidden="true"
        data-ornament
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(100%,56rem)] w-full [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_80%,transparent)] object-cover object-[50%_70%]"
      />
      <Container className="relative">
        <Grid>
          <Heading id="journal-title" className="relative z-1 col-span-full max-w-(--measure-heading) lg:col-end-8 lg:row-start-1">
            {t('heading')}
          </Heading>
          <Prose variant="lead" className="relative z-1 col-span-full mt-6 md:col-end-7 lg:col-start-1 lg:col-end-7 lg:row-start-2 lg:mt-8">
            {t('body')}
          </Prose>

          {photos.length > 0 && (
            <ul
              role="list"
              className="col-span-full mt-10 grid grid-cols-4 items-start gap-x-gap gap-y-4 md:grid-cols-6 md:gap-y-6 lg:mt-12 lg:grid-cols-12 lg:gap-y-10"
            >
              {photos.map((photo, i) => (
                <li key={photo.id} className={SLOT[i % 6]}>
                  <PhotoFrame photo={photo} ratio="var(--r)" sizes={SIZES} />
                </li>
              ))}
            </ul>
          )}

        </Grid>
      </Container>

      <Container className="relative">
        <Grid>
          {/* Launch video slot: dev-only marker until the file exists. No autoplay, ever. */}
          <Todo tag="video" block className="col-span-full mt-16 aspect-video lg:col-start-2 lg:col-end-12" />

          {closing ? (
            <p
              className="relative z-1 col-span-full mt-8 max-w-[26ch] font-serif text-quote text-balance italic text-plum-ink lg:col-end-11 lg:mt-12"
            >
              {closing}
            </p>
          ) : (
            <Todo tag="copy-vi" className="col-span-full mt-8 lg:mt-6" />
          )}
        </Grid>
      </Container>
    </Section>
  );
}
