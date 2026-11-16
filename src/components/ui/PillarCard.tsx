/**
 * One pillar of the lotus (S3). Not interactive. An opaque paper card, because the deck stacks: the
 * runtime makes each card sticky so the next slides over it, and sets `data-active` on the current one.
 */
export function PillarCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="w-full rounded-card border border-blush-line bg-paper p-6 transition-[border-color,box-shadow] duration-(--dur-fade) data-[active=true]:border-petal-soft data-[active=true]:shadow-lift md:p-8">
      <h3 className="font-serif text-h3 font-medium text-plum-ink">{title}</h3>
      <p className="mt-4 text-body text-ink-soft">{body}</p>
    </article>
  );
}
