import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/ui';

const PILLARS = ['economic', 'education', 'mentorship'] as const;

type BandLineProps = {
  /** Slides the other way, so two bands on one page run against each other. */
  reverse?: boolean;
  /** Colour of the outlined repeat; the first run takes the text colour. */
  outline?: string;
  className?: string;
  children: ReactNode;
};

/**
 * One line of very large italic type that slides sideways with scroll (the runtime drives every [data-band]).
 * Decoration only: whatever it says is read elsewhere on the page, so it is hidden from assistive tech, and
 * it sits still under reduced motion. It bleeds off both edges: the caller's wrapper clips it (overflow-x:
 * clip, never hidden: that would break a pin above it).
 */
export function BandLine({ reverse, outline = 'var(--plum-ink)', className, children }: BandLineProps) {
  return (
    <p
      aria-hidden="true"
      data-ornament
      data-band={reverse ? 'reverse' : ''}
      className={`flex w-max pl-gutter font-serif text-mega whitespace-nowrap italic ${className ?? ''}`}
    >
      <span>{children}</span>
      {/* the line again, in outline, so the band never runs out while it slides */}
      <span className="text-transparent [-webkit-text-stroke:1.5px_var(--band-outline)]" style={{ '--band-outline': outline } as CSSProperties}>
        {children}
      </span>
    </p>
  );
}

/** The band between Bloom and Vision: the three pillar titles (they are read in the cards above). */
export async function KineticBand() {
  const t = await getTranslations('home.pillars');

  return (
    <Section as="div" tone="cream" pad="none" className="overflow-x-clip">
      <BandLine className="pb-2 text-plum-ink">
        {PILLARS.map((key) => (
          <Fragment key={key}>
            {t(`${key}.title`)}
            <span className="mx-[0.35em] not-italic text-lotus-pink">·</span>
          </Fragment>
        ))}
      </BandLine>
    </Section>
  );
}
