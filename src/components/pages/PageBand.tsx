import { Fragment } from 'react';
import { Section, type SectionProps } from '@/components/ui';

type PageBandProps = Pick<SectionProps, 'tone' | 'from'> & {
  /** Words the page has already set as readable copy (product names, the three ways in). */
  items: string[];
};

/**
 * A sub-page's kinetic band: the home page's KineticBand (same markup, so the runtime slides it the same
 * way) with the page's own words, one size down so it never outweighs the links and titles it repeats.
 * Decoration only, hidden from assistive tech, still under reduced motion.
 */
export function PageBand({ items, tone = 'cream', from }: PageBandProps) {
  const line = items.map((item) => (
    <Fragment key={item}>
      {item}
      <span className="mx-[0.35em] not-italic text-lotus-pink">·</span>
    </Fragment>
  ));

  return (
    <Section as="div" tone={tone} from={from} pad="none" className="overflow-x-clip py-2 lg:py-4">
      <p
        aria-hidden="true"
        data-ornament
        data-band
        className="flex w-max pb-2 pl-gutter font-serif text-h2 whitespace-nowrap italic text-fg-heading"
      >
        <span>{line}</span>
        {/* the line again, in outline, so the band never runs out while it slides */}
        <span className="text-transparent [-webkit-text-stroke:1.5px_var(--fg-heading)]">{line}</span>
        {/* and once more: three short words at this size are narrower than a wide screen plus the slide */}
        <span>{line}</span>
      </p>
    </Section>
  );
}
