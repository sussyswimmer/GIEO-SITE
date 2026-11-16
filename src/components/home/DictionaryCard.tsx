import { cx } from '@/lib/cx';
import { Heading, Hairline, Prose } from '@/components/ui';

export type DictionaryCardProps = {
  word: string;
  pos: string;
  pron: string;
  gloss: string;
  body: string;
  /** id for the word heading; the Meaning section labels itself with it. */
  headingId?: string;
  className?: string;
};

/** The dictionary entry: word, part of speech, pronunciation, gloss, then the body. Not interactive. */
export function DictionaryCard({ word, pos, pron, gloss, body, headingId, className }: DictionaryCardProps) {
  return (
    <article
      className={cx(
        'max-w-[40rem] rounded-card border border-blush-line bg-paper p-6 md:p-8 lg:p-12',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 id={headingId} lang="vi" className="font-serif text-quote italic text-plum-ink">
          {word}
        </h2>
        {/* Pronunciation in the sans face: the ɛ glyph is not in either web font (DESIGN.md §3). */}
        <span className="font-sans text-ui text-ink-soft">{pos}</span>
        <span className="font-sans text-ui text-ink-soft">{pron}</span>
      </div>
      <Heading as="p" level="h3" className="mt-2">
        {gloss}
      </Heading>
      <Hairline className="my-6" />
      <Prose>{body}</Prose>
    </article>
  );
}
