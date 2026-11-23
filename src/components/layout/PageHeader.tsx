import type { CSSProperties, ReactNode } from 'react';
import { getLocale } from 'next-intl/server';
import { preload } from 'react-dom';
import { ArtLife } from '@/components/pages/ArtLife';
import { type Art, fit } from '@/components/pages/art';
import { Container, Hairline, Prose, Section } from '@/components/ui';

// The title is italic on the first screen, so its face cannot wait for LateFonts (after load): until it
// arrived the title stood upright and then changed shape. Declared here, on inner pages only; the home
// page still has no italic face in front of its LCP.
const italic = (set: string, range: string) =>
  `@font-face{font-family:"Playfair Display";font-style:italic;font-weight:400;font-display:swap;src:url("/fonts/playfair-display-${set}-400-italic.woff2") format("woff2");unicode-range:${range}}`;
const ITALIC_FACES =
  italic('latin', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD') +
  italic('vietnamese', 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB');

type PageHeaderProps = {
  title: string;
  intro?: string;
  /** The page's still-life (public/art/pages). The header lays out without it. */
  art?: Art;
  /** `collections.noinep.credit`, shown under art that has products in it. */
  credit?: string;
  /** Actions under the intro. */
  children?: ReactNode;
};

/**
 * Inner-page header (docs/08 §4): one full screen. The only <h1> on an inner page, very large and italic,
 * stands on a stitched rule at the foot of the screen; the intro sits above it and the page's still-life
 * beside it, drifting against the scroll, with the title's last letters running over its foot.
 * Below 1024 the same things stack: title, intro, still-life, rule.
 */
export async function PageHeader({ title, intro, art, credit = '', children }: PageHeaderProps) {
  const locale = await getLocale();
  const font = { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' } as const;
  preload('/fonts/playfair-display-latin-400-italic.woff2', font);
  if (locale === 'vi') preload('/fonts/playfair-display-vietnamese-400-italic.woff2', font);

  return (
    <Section as="header" tone="cream" glow="dawn" pad="none">
      <style>{ITALIC_FACES}</style>
      <Container className="relative flex flex-col pt-[calc(var(--nav-offset)+var(--space-6))] pb-6 lg:min-h-svh lg:pt-[calc(var(--nav-offset)+var(--space-12))] lg:pb-8">
        <h1
          className="word-in relative z-1 font-serif text-mega italic text-fg-heading lg:order-2 lg:mt-auto"
          style={{ fontSize: fit(title, 0.6, '3rem', '12rem') }}
        >
          {title}
        </h1>

        {(intro || children) && (
          <div className="rise-in relative z-1 mt-4 lg:order-1 lg:mt-0 lg:max-w-[38%]">
            {intro && <Prose variant="lead">{intro}</Prose>}
            {children && <div className="mt-6 flex flex-wrap items-center gap-4 lg:mt-8">{children}</div>}
          </div>
        )}

        {art && (
          // --ar keeps the still inside the screen on a short window: its height is capped, its width follows.
          <div
            className="relative -mr-gutter mt-6 ml-auto w-[88%] md:w-3/5 lg:absolute lg:top-(--nav-offset) lg:right-0 lg:mt-0 lg:mr-0 lg:w-[min(56%,calc((100svh-var(--nav-offset)-9rem)*var(--ar)))]"
            style={{ '--ar': art.w / art.h } as CSSProperties}
          >
            <div
              aria-hidden="true"
              data-glow
              className="absolute -inset-y-[8%] right-0 -left-[8%]"
              style={{ backgroundImage: 'var(--still-bloom)' }}
            />
            <ArtLife art={art} credit={credit} eager sizes="(min-width: 1024px) 56vw, 88vw" className="relative" creditClassName="mt-1 ml-[10%]" />
          </div>
        )}

        <Hairline className="mt-6 lg:order-3 lg:mt-4" />
      </Container>
    </Section>
  );
}
