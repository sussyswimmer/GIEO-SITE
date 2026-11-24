import { getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';
import { Container, Grid, Heading, PhotoPrint, Prose, Section, Todo } from '@/components/ui';
import { photo as photoById } from '@/lib/photos';
import { art } from '@/components/pages/art';
import { HOME_STILLS, listStills } from '@/lib/stills';
import { StillLife } from './StillLife';

// GIEO's season in six photographs, laid as prints: from 1024 a loose cluster beside the heading (two rows,
// overlapping a little, tilts alternating), under that the same six in two loose rows of three under the
// paragraph, all in view: no sideways strip, which a keyboard or a mouse without a trackpad could not move.
// Per print: the photo's id, the picture's proportions, where the picture sits in the frame, the tilt, and its
// place in the cluster's box (left, top and width in % of the box; the box is 7 / 5). Under 1024 an upright
// print is narrower than a wide one, so they stand about the same height.
type JournalPrint = { id: string; ratio: string; focus?: string; tilt: number; at: [l: number, t: number, w: number]; wide: boolean };
const PRINTS: JournalPrint[] = [
  { id: '01-loom-weaver', ratio: '3 / 4', focus: '50% 42%', tilt: 2, at: [33, 0, 21], wide: false },
  { id: '02-stilt-house', ratio: '4 / 3', tilt: -2.5, at: [0, 12, 31], wide: true },
  { id: '03-heddles', ratio: '4 / 3', tilt: 1.5, at: [52, 14, 30], wide: true },
  { id: '04-sewing-hands', ratio: '4 / 5', focus: '50% 40%', tilt: -1.5, at: [12, 52, 21], wide: false },
  { id: '05-cloth-on-loom', ratio: '4 / 5', tilt: 2.5, at: [70, 50, 22], wide: false },
  { id: '06-valley', ratio: '3 / 2', tilt: -1, at: [31, 56, 31], wide: true },
];
// What each print is drawn at: in the cluster (its share of a box half the page wide from 1280, beside a
// heading that needs a column more before that), in the rows.
const printSizes = (w: number, wide: boolean) =>
  `(min-width: 1280px) ${Math.round(w / 2.2)}vw, (min-width: 1024px) ${Math.round(w / 2.7)}vw, (min-width: 768px) ${wide ? 26 : 19}vw, ${wide ? 30 : 22}vw`;

// The rail: still-lifes in one row that slides sideways with scroll, the picture version of the kinetic
// band. They stand on one ground line and differ in size, so the row has a rhythm.
const RAIL_SIZES = '(min-width: 1024px) 30vw, 62vw';
const RAIL_SLOT = ['w-[62vw] lg:w-[30vw]', 'w-[54vw] lg:w-[25vw]', 'w-[58vw] lg:w-[27vw]'] as const;

/**
 * S5. GIEO's season: the heading and paragraph, GIEO's own photographs laid beside them as prints (consented,
 * with alt text: a photo without both is left out), then a rail of still-lifes (the Blender stills Hands does
 * not use, then the illustrated ones from public/art/pages) that slides sideways with scroll, on a horizon of
 * pale ridges behind the heading (docs/08 H3). Neither carries a caption that states a fact; a still that
 * shows products carries the partner credit.
 */
export async function Journal() {
  const t = await getTranslations('home.journal');
  const tAll = await getTranslations();

  // Alt text is the content key photos.<id>.alt; a photo without it, or without consent, is not shown.
  const prints = PRINTS.flatMap((p) => {
    const photo = photoById(p.id, tAll);
    return photo ? [{ ...p, photo }] : [];
  });
  const stills = [...listStills(HOME_STILLS).slice(2, 5), ...['get-involved', 'about', 'contact'].flatMap((name) => art(`pages/${name}`) ?? [])];
  const credit = tAll('collections.noinep.credit');
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

          {prints.length > 0 && (
            // One list, two layouts: under 1024 two loose rows of three under the paragraph, from 1024 the
            // cluster's box beside the heading.
            <ul
              role="list"
              className="col-span-full mt-10 flex flex-wrap items-center justify-center gap-x-[4%] gap-y-8 md:gap-x-[3%] lg:relative lg:col-start-8 lg:col-end-13 xl:col-start-7 lg:row-start-1 lg:row-end-3 lg:m-0 lg:block lg:aspect-[7/5] lg:self-center"
            >
              {prints.map(({ id, photo, ratio, focus, tilt, at: [l, t, w], wide }) => (
                <li
                  key={id}
                  className={`${wide ? 'w-[32%] md:w-[29%]' : 'w-[23%] md:w-[21%]'} lg:absolute lg:top-(--t) lg:left-(--l) lg:w-(--w)`}
                  style={{ '--l': `${l}%`, '--t': `${t}%`, '--w': `${w}%` } as CSSProperties}
                >
                  <PhotoPrint photo={photo} ratio={ratio} focus={focus} tilt={tilt} sizes={printSizes(w, wide)} />
                </li>
              ))}
            </ul>
          )}

        </Grid>
      </Container>

      {stills.length > 0 && (
        <div className="relative mt-8 overflow-x-clip lg:mt-10">
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
