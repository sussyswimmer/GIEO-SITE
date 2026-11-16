import { Hairline, Prose } from '@/components/ui';

export type DictionaryEntryProps = {
  word: string;
  pos: string;
  pron: string;
  gloss: string;
  body: string;
  /** id for the word heading; the section labels itself with it. */
  headingId?: string;
  className?: string;
};

/** The dictionary entry set large and open (the home page's card, without the box). Not interactive. */
export function DictionaryEntry({ word, pos, pron, gloss, body, headingId, className }: DictionaryEntryProps) {
  return (
    <article className={className}>
      <div className="flex flex-wrap items-baseline gap-x-6">
        <h2 id={headingId} lang="vi" className="font-serif text-mega italic text-fg-heading">
          {word}
        </h2>
        {/* Pronunciation in the sans face: the ɛ glyph is in neither web font (DESIGN.md §3). */}
        <span className="font-sans text-lead text-fg-strong">{pos}</span>
        <span className="font-sans text-lead text-fg-strong">{pron}</span>
      </div>
      <p className="font-serif text-quote text-fg-heading">{gloss}</p>
      <Hairline className="my-6 lg:my-8" />
      <Prose variant="lead">{body}</Prose>
    </article>
  );
}
