import { getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';
import { ItalicFaces } from '@/components/layout/PageHeader';
import { Container, PhotoPrint, Prose, Section } from '@/components/ui';
import { PhotoViewer, type ViewerPhoto } from '@/components/ui/PhotoViewer';
import { photo as photoById, type ShownPhoto } from '@/lib/photos';
import { fit } from './art';

// The About page's first screen, third version (Maxwell, 2026-11-24: "I don't like the about landing page";
// the plum one with the name set down the page, 2026-11-19, is in git history). GIEO's own photographs are
// the picture now: the title and intro on cream at the left, and beside them two columns of prints drifting
// slowly past in opposite directions, after the image-marquee heroes on 21st.dev, built here in CSS alone
// (globals.css "About hero: photo marquee"). A column stops under the pointer or keyboard focus; any print opens in the
// photo viewer. Phones: one row drifting sideways under the text. Reduced motion: nothing drifts.
// Every consented photo is here, split so neither column holds two of a kind in a row.
const COLUMNS: string[][] = [
  ['01-loom-weaver', '02-stilt-house', '04-sewing-hands', 'nep-cloth', 'bag-pink', '06-valley'],
  ['03-heddles', '05-cloth-on-loom', 'lipstick-on-bag', 'sewing-cloth', 'loom-cloth'],
];
const TILTS = [-1.5, 1, -0.5, 1.5, -1, 0.5];
const GROUP = 'about-hero';

type Placed = { photo: ShownPhoto; index: number };

export async function AboutHero() {
  const t = await getTranslations();
  const title = t('about.title');
  const viewLabel = t('home.journal.viewer.open');

  let n = 0;
  const columns: Placed[][] = COLUMNS.map((ids) =>
    ids.flatMap((id) => {
      const photo = photoById(id, t);
      return photo ? [{ photo, index: n++ }] : [];
    }),
  ).filter((c) => c.length > 0);
  const all = columns.flat();
  const viewerPhotos: ViewerPhoto[] = all.map(({ photo: { id, alt, width, height, src, variants } }) => ({ id, alt, width, height, src, variants }));

  // The marquee is for the eye and the pointer: every print opens on a click or a tap, but none takes a Tab stop
  // and the whole of it is hidden from assistive tech. A print that moves and is clipped by its column cannot
  // hold keyboard focus in view, and every one of these photos is also on the site in a still form a keyboard
  // reaches (the About gallery below; the product photos on Collections).
  const run = (items: Placed[], sizes: string, repeat: boolean) =>
    items.map(({ photo, index }, i) => (
      <PhotoPrint
        key={`${repeat ? 'r' : 'a'}-${photo.id}`}
        photo={photo}
        tilt={TILTS[(index + i) % TILTS.length]}
        sizes={sizes}
        className="marquee-print"
        shape={photo.height > photo.width * 1.15 ? 'tall' : 'wide'}
        view={{ group: GROUP, index, label: viewLabel, repeat: true }}
      />
    ));

  return (
    <Section as="header" tone="cream" glow="dawn" pad="none" className="overflow-clip">
      <ItalicFaces />
      <Container className="relative grid items-center gap-y-8 lg:min-h-svh pt-[calc(var(--nav-offset)+var(--space-6))] pb-10 lg:grid-cols-12 lg:gap-x-gap lg:py-0">
        <div className="relative z-1 lg:col-span-5 lg:py-[calc(var(--nav-offset)+var(--space-6))]">
          <h1 className="word-in font-serif text-mega italic text-fg-heading" style={{ fontSize: fit(title, 1.05, '3.5rem', '9rem') }}>
            {title}
          </h1>
          <Prose variant="lead" className="rise-in mt-6 max-w-[34ch] lg:mt-8">
            {t('about.intro')}
          </Prose>
          <small className="rise-in mt-6 block text-caption text-fg-body">{t('footer.supportedBy')}</small>
        </div>

        {all.length > 0 && (
          <>
            {/* From 1024: two columns, the first drifting up, the second down, over the right of the screen. */}
            <div aria-hidden="true" className="marquee-cols max-lg:hidden lg:col-span-7 lg:col-start-6">
              {columns.map((items, c) => (
                <div key={c} className="marquee-col" data-dir={c % 2 ? 'down' : 'up'} style={{ '--marquee-s': `${44 + items.length * 6}s` } as CSSProperties}>
                  <div className="marquee-track">
                    {run(items, '(min-width: 1024px) 24vw, 1px', false)}
                    <div className="contents">
                      {run(items, '(min-width: 1024px) 24vw, 1px', true)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Under 1024: every print in one row drifting sideways, bleeding off both edges. */}
            <div aria-hidden="true" className="marquee-row -mx-gutter lg:hidden" style={{ '--marquee-s': `${all.length * 7}s` } as CSSProperties}>
              <div className="marquee-track">
                {run(all, '(min-width: 1024px) 1px, (min-width: 640px) 30vw, 46vw', false)}
                <div className="contents">
                  {run(all, '(min-width: 1024px) 1px, (min-width: 640px) 30vw, 46vw', true)}
                </div>
              </div>
            </div>
          </>
        )}
      </Container>
      {all.length > 0 && (
        <PhotoViewer
          group={GROUP}
          photos={viewerPhotos}
          labels={{
            close: t('home.journal.viewer.close'),
            previous: t('home.journal.viewer.previous'),
            next: t('home.journal.viewer.next'),
            count: t.raw('home.journal.viewer.count') as string,
          }}
        />
      )}
    </Section>
  );
}
