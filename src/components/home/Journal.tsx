import { getTranslations } from 'next-intl/server';
import { Container, Grid, Heading, PhotoFrame, Prose, Section, Todo } from '@/components/ui';
import { journalPhotos } from '@/lib/photos';
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

// Three large stills in one full-bleed row, each a third of the screen. From 1024 they step up to the
// right, so the last one sits beside the heading and the closing line takes its place in the row.
// Below that: one across, then two side by side.
const STILL_SLOT = ['col-span-2 w-4/5 lg:col-span-1 lg:w-auto', 'lg:-mt-[12%]', 'lg:-mt-[96%]'] as const;

/**
 * S5. GIEO's season. Consented photos when GIEO sends them; until then three Blender still-lifes
 * (after the two Hands uses), unveiled by clip-path with layered parallax. A still carries no caption
 * that states a fact; one that shows products carries the partner credit.
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
  const stills = photos.length > 0 ? [] : listStills(HOME_STILLS).slice(2, 5);
  const credit = tAll('collections.hmong.credit');
  const closing = t('closing');

  return (
    <Section tone="cream" from="paper" pad="none" id="journal" labelledBy="journal-title" thread="right" className="pt-section-sm pb-section-sm lg:pb-10">
      <Container>
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

          {stills.length > 0 && (
            <div className="col-span-full -mx-gutter mt-8 grid grid-cols-2 items-start lg:row-start-3 lg:mt-2 lg:grid-cols-3">
              {stills.map((still, i) => (
                <StillLife key={still.name} still={still} credit={credit} index={i} sizes="(min-width: 1024px) 34vw, 100vw" className={STILL_SLOT[i]} />
              ))}
            </div>
          )}

          {/* Launch video slot: dev-only marker until the file exists. No autoplay, ever. */}
          <Todo tag="video" block className="col-span-full mt-16 aspect-video lg:col-start-2 lg:col-end-12" />

          {closing ? (
            <p
              className={`relative z-1 col-span-full mt-8 max-w-[30ch] font-serif text-h3 italic text-plum-ink ${
                stills.length > 0 ? 'lg:col-start-9 lg:row-start-3 lg:mt-10' : 'lg:col-end-9 lg:mt-6'
              }`}
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
