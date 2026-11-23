import type { ReactNode } from 'react';

type PillarCardProps = {
  title: string;
  body: string;
  /** A small decorative object for the card (a cut-out or a scrub clip). It sits beside the body, never over it. */
  art?: ReactNode;
};

/**
 * One pillar of the lotus (S3). Not interactive. An opaque paper card, because the deck stacks: the
 * runtime makes each card sticky so the next slides over it, and sets `data-active` on the current one.
 * Sizes follow the card's own width (container units), so the title stays on one line, which is the row a
 * stacked card keeps showing: 22 px on a phone, about 39 px in a seven-column card; the body runs 18 to 22 px.
 */
export function PillarCard({ title, body, art }: PillarCardProps) {
  return (
    <article className="@container w-full rounded-card border border-blush-line bg-paper p-6 transition-[border-color,box-shadow] duration-(--dur-fade) data-[active=true]:border-petal-soft data-[active=true]:shadow-lift md:p-8 lg:p-10">
      <h3 className="font-serif text-[clamp(1.375rem,5.8cqw,2.75rem)] leading-(--lh-h3) tracking-(--ls-heading) text-plum-ink italic">{title}</h3>
      <div className="mt-4 @xl:mt-6 @xl:flex @xl:items-center @xl:gap-8">
        <p className="text-[clamp(1.125rem,3cqw,1.375rem)] leading-(--lh-lead) font-light text-ink">{body}</p>
        {art && <div className="mt-4 ml-auto w-2/5 shrink-0 @xl:mt-0 @xl:w-[24%]">{art}</div>}
      </div>
    </article>
  );
}
