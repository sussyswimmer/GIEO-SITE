import { Fragment } from 'react';
import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/ui';

const PILLARS = ['economic', 'education', 'mentorship'] as const;

/**
 * The band between Bloom and Vision: the three pillar titles as one line of very large italic type that
 * slides sideways with scroll. Decoration only (the titles are read in the cards above), so it is hidden
 * from assistive tech and sits still under reduced motion. It bleeds off both edges; the clip is on this
 * wrapper, which holds no pinned element.
 */
export async function KineticBand() {
  const t = await getTranslations('home.pillars');
  const line = PILLARS.map((key) => (
    <Fragment key={key}>
      {t(`${key}.title`)}
      <span className="mx-[0.35em] not-italic text-lotus-pink">·</span>
    </Fragment>
  ));

  return (
    <Section as="div" tone="cream" pad="none" className="overflow-x-clip">
      <p
        aria-hidden="true"
        data-ornament
        data-band
        className="flex w-max pb-2 pl-gutter font-serif text-mega whitespace-nowrap italic text-plum-ink"
      >
        <span>{line}</span>
        {/* the line again, in outline, so the band never runs out while it slides */}
        <span className="text-transparent [-webkit-text-stroke:1.5px_var(--plum-ink)]">{line}</span>
      </p>
    </Section>
  );
}
