import { getTranslations } from 'next-intl/server';
import { Container, Grid, Heading, PhotoFrame, Prose, Section, Todo } from '@/components/ui';
import { journalPhotos } from '@/lib/photos';
import { art } from '@/components/pages/art';
import { HOME_STILLS, listStills } from '@/lib/stills';
import { StillLife } from './StillLife';

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

// The rail: still-lifes in one row that slides sideways with scroll, the picture version of the kinetic
// band. They stand on one ground line and differ in size, so the row has a rhythm.
const RAIL_SIZES = '(min-width: 1024px) 30vw, 62vw';
const RAIL_SLOT = ['w-[62vw] lg:w-[30vw]', 'w-[54vw] lg:w-[25vw]', 'w-[58vw] lg:w-[27vw]'] as const;

/**
 * S5. GIEO's season. Consented photos when GIEO sends them; until then a rail of still-lifes (the Blender
 * stills Hands does not use, then the illustrated ones from public/art/pages) that slides sideways with
 * scroll, on a horizon of pale ridges behind the heading (docs/08 H3). A still carries no caption that
 * states a fact; one that shows products carries the partner credit.
 */
export async function Journal() {
  const t = await getTranslations('home.journal');
  const tAll = await getTranslations();

  // Alt text is the content key photos.<id>.alt; a photo without it is not shown (PLAN.md §5, §6).
  const photos = journalPhotos.flatMap((p) => {
    const key = `photos.${p.id}.alt`;
    const alt = p.consent && tAll.has(key) ? tAll(key) : '';
    return alt ? [{ ...p, alt }] : [];
  });
  const stills =
    photos.length > 0
      ? []
      : [...listStills(HOME_STILLS).slice(2, 5), ...['get-involved', 'about', 'contact'].flatMap((name) => art(`pages/${name}`) ?? [])];
  const credit = tAll('collections.hmong.credit');
  const closing = t('closing');

  return (
    <Section tone="cream" pad="none" id="journal" labelledBy="journal-title" thread="right" className="pt-section-sm pb-section-sm lg:pb-10">
      {/* A horizon behind the heading and the rail: an illustration on the section's own cream, eased out at
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

      {stills.length > 0 && (
        <div className="relative mt-8 overflow-x-auto [html[data-motion=on]_&]:overflow-x-clip lg:mt-10">
          <div data-band className="flex w-max items-end gap-[4vw] pl-gutter lg:gap-[2.5vw]">
            {stills.map((still, i) => (
              <StillLife key={still.src} still={still} credit={credit} index={i % 3} sizes={RAIL_SIZES} className={RAIL_SLOT[i % 3]} />
            ))}
          </div>
        </div>
      )}

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
