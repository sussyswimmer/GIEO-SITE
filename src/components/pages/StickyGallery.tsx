import { getTranslations } from 'next-intl/server';
import { Container, Heading, PhotoPrint, Prose, Section } from '@/components/ui';
import { PhotoViewer, type ViewerPhoto } from '@/components/ui/PhotoViewer';
import { photo as photoById, type ShownPhoto } from '@/lib/photos';

// The About page's gallery of GIEO's photographs, after the "sticky scroll" layout Maxwell chose (21st.dev,
// uilayout): three columns, the middle one holding still while the two beside it scroll past. Here the middle
// is the cloth itself, and the columns are the work around it. Plain CSS sticky, no scroll hijack: from 1024
// the middle column sticks for the height of the side columns less one screen, about one screen (under
// CLAUDE.md's 150vh). Phones and reduced motion: no sticking, the prints in two loose columns, the cloth first.
// Per print: the photo's id and its tilt. Photos keep their own proportions.
type GalleryPrint = { id: string; tilt: number };
const CENTRE: GalleryPrint = { id: 'nep-cloth', tilt: 0 };
const LEFT: GalleryPrint[] = [
  { id: '01-loom-weaver', tilt: -1.5 },
  { id: '03-heddles', tilt: 1.5 },
  { id: '04-sewing-hands', tilt: -1 },
  { id: '06-valley', tilt: 1 },
];
const RIGHT: GalleryPrint[] = [
  { id: '05-cloth-on-loom', tilt: 1.5 },
  { id: 'sewing-cloth', tilt: -1.5 },
  { id: 'loom-cloth', tilt: 1 },
];
const GROUP = 'about-gallery';
const SIDE_SIZES = '(min-width: 1024px) 28vw, 44vw';
const CENTRE_SIZES = '(min-width: 1024px) 34vw, 86vw';

type Placed = GalleryPrint & { photo: ShownPhoto; index: number };

// On the story section's paper, so the pillars' own handoff from paper (about/page.tsx) still holds.
export async function StickyGallery() {
  const t = await getTranslations();
  const viewLabel = t('home.journal.viewer.open');

  // Reading order for the viewer: the cloth, then the columns side by side, row by row.
  let n = 0;
  const place = (list: GalleryPrint[]): Placed[] =>
    list.flatMap((p) => {
      const photo = photoById(p.id, t);
      return photo ? [{ ...p, photo, index: -1 }] : [];
    });
  const centre = place([CENTRE])[0];
  const left = place(LEFT);
  const right = place(RIGHT);
  const ordered: Placed[] = [];
  if (centre) ordered.push(centre);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (left[i]) ordered.push(left[i]);
    if (right[i]) ordered.push(right[i]);
  }
  for (const p of ordered) p.index = n++;
  if (ordered.length === 0) return null;

  const viewerPhotos: ViewerPhoto[] = ordered.map(({ photo: { id, alt, width, height, src, variants } }) => ({ id, alt, width, height, src, variants }));
  const print = (p: Placed, sizes: string, className?: string) => (
    <PhotoPrint key={p.id} photo={p.photo} tilt={p.tilt} sizes={sizes} className={className} view={{ group: GROUP, index: p.index, label: viewLabel }} />
  );

  return (
    <Section tone="paper" pad="none" id="gallery" labelledBy="gallery-title" className="pt-section-sm pb-section-sm">
      <Container>
        <Heading id="gallery-title" className="max-w-(--measure-heading)">
          {t('home.journal.heading')}
        </Heading>
        <Prose variant="lead" className="mt-6 lg:mt-8">
          {t('home.journal.body')}
        </Prose>

        <div className="sticky-gallery mt-12 lg:mt-16">
          <div className="sticky-gallery-col" data-side="left">
            {left.map((p) => print(p, SIDE_SIZES))}
          </div>
          {centre && (
            <div className="sticky-gallery-centre">
              <div className="sticky-gallery-hold">{print(centre, CENTRE_SIZES)}</div>
            </div>
          )}
          <div className="sticky-gallery-col" data-side="right">
            {right.map((p) => print(p, SIDE_SIZES))}
          </div>
        </div>
      </Container>
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
    </Section>
  );
}
