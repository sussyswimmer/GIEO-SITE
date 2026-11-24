import type { CSSProperties } from 'react';
import { Flecks, type Fleck } from '@/components/home/Hands';
import { ItalicFaces } from '@/components/layout/PageHeader';
import { Container, Prose, Section } from '@/components/ui';
import { ArtLife } from './ArtLife';
import type { Art } from './art';

type AboutHeroProps = {
  /** The page's <h1> (`about.title`), set small above the name. */
  title: string;
  /** GIEO's full name (`home.hero.eyebrow`): always English, as GIEO writes it. */
  name: string;
  intro: string;
  art?: Art;
};

const FLECKS: Fleck[] = [
  [6, 4, 1.2, -25, 'petal', 110],
  [94, -3, 0.9, 50, 'deep', 160],
  [-4, 62, 1, 140, 'leaf', 90],
  [102, 70, 1.3, 15, 'petal', 70],
  [40, 104, 0.8, -60, 'cream', 130],
];

/**
 * The About page's first screen (Maxwell, 2026-11-19: "completely redo the about page, it's too weak"). On
 * plum, the one dark tone. The name is the picture: GIEO's full name set as large as the screen allows, one
 * line to each capital, so the four initials stand under each other at the left edge and spell GIEO down the
 * page. The initials are in the petal pink; the small joining words are italic. Each line slides up from
 * under its own foot on load. The lotus stands beside it, drifting against the scroll, with loose petals.
 * Nothing here is new copy: the title, the name and the intro are GIEO's own strings.
 */
export function AboutHero({ title, name, intro, art }: AboutHeroProps) {
  // A new line at every capitalised word: "Girls'", "Initiative for", "Education and", "Opportunities".
  const lines: string[][] = [];
  for (const word of name.split(' ')) {
    if (!lines.length || word[0] !== word[0].toLowerCase()) lines.push([word]);
    else lines[lines.length - 1].push(word);
  }

  return (
    <Section as="header" tone="plum" pad="none" className="overflow-clip">
      <ItalicFaces />
      <Container className="relative flex min-h-svh flex-col justify-end pt-[calc(var(--nav-offset)+var(--space-6))] pb-8 lg:pb-12">
        {art && (
          <div className="relative -mr-gutter mb-2 ml-auto w-3/5 sm:w-2/5 lg:absolute lg:right-0 lg:bottom-[9%] lg:mr-0 lg:mb-0 lg:w-[min(36%,58svh)]">
            <div aria-hidden="true" data-glow className="about-bloom" />
            <Flecks items={FLECKS} />
            <ArtLife art={art} eager drift={5} sizes="(min-width: 1024px) 36vw, 60vw" className="relative" />
          </div>
        )}

        <h1 className="rise-in relative z-1 text-ui font-medium tracking-[0.2em] text-fg-body uppercase">{title}</h1>
        <p lang="en" className="about-name relative z-1 mt-3 font-serif text-fg-heading lg:mt-5">
          {lines.map((words, i) => (
            <span key={i} className="slide-up" style={{ '--i': i } as CSSProperties}>
              <span>
                {words.map((word, k) =>
                  k === 0 ? (
                    <span key={k}>
                      <span className="about-initial">{word[0]}</span>
                      {word.slice(1)}
                    </span>
                  ) : (
                    <i key={k} className="about-joiner">
                      {' '}
                      {word}
                    </i>
                  ),
                )}
                {i < lines.length - 1 ? ' ' : ''}
              </span>
            </span>
          ))}
        </p>
        <Prose variant="lead" className="rise-in relative z-1 mt-6 max-w-[34ch] lg:mt-8">
          {intro}
        </Prose>
      </Container>
    </Section>
  );
}
