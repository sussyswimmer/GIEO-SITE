import { getTranslations } from 'next-intl/server';
import { Container, Grid, Heading, PhotoFrame, Prose, Section, Todo } from '@/components/ui';
import { journalPhotos, withAlt } from '@/lib/photos';

const SIZES = '(min-width: 1024px) 40vw, (min-width: 768px) 60vw, 90vw';

// Six-photo module for GIEO's own photos. Index i uses slot i % 6; ratio and placement come from the same slot.
const RATIO = ['4 / 5', '3 / 2', '1 / 1', '4 / 5', '3 / 4', '16 / 9'] as const;
const SLOT = [
  'col-start-1 col-end-5 md:col-start-1 md:col-end-6 lg:col-start-1 lg:col-end-6',
  'col-start-2 col-end-5 md:col-start-4 md:col-end-9 lg:col-start-7 lg:col-end-13 lg:mt-24',
  'col-start-1 col-end-5 md:col-start-1 md:col-end-6 lg:col-start-2 lg:col-end-5',
  'col-start-2 col-end-5 md:col-start-4 md:col-end-9 lg:col-start-6 lg:col-end-10 lg:mt-16',
  'col-start-1 col-end-5 md:col-start-1 md:col-end-6 lg:col-start-10 lg:col-end-13 lg:mt-32',
  'col-start-2 col-end-5 md:col-start-4 md:col-end-9 lg:col-start-3 lg:col-end-11',
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
              className="col-span-full mt-16 grid grid-cols-4 items-start gap-x-gap gap-y-8 md:grid-cols-8 md:gap-y-12 lg:mt-24 lg:grid-cols-12 lg:gap-y-16"
            >
              {photos.map((photo, i) => (
                <li key={photo.id} className={SLOT[i % 6]}>
                  <PhotoFrame photo={photo} ratio={RATIO[i % 6]} sizes={SIZES} />
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
