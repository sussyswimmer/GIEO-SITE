import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import { Container, Grid, Prose, ScrubClip, Section } from '@/components/ui';
import { HOME_STILLS, listStills } from '@/lib/stills';
import { StillLife } from './StillLife';

/**
 * S2 Hands: who makes the products, and who the work is for (the old Partner and NextGen sections).
 * First screen: the partner's name very large, the products still standing beside it (the credit under
 * it) and the partner paragraph under the name. A strip of thread unwinds across the page between the two
 * screens: it is their divider.
 * Second screen: the cloth still beside the paragraph on the next generation, whose first sentence is set
 * large in italic (the same paragraph, cut at its first full stop: no word is added or moved), and under the
 * cloth a dish of sprouts that grows as it is scrolled past. The stills are large and bleed past the gutters;
 * the block reads complete without them.
 *
 * Maxwell, 2026-11-19: "this entire section seems very bland". So it moves and has light in it now: the
 * name is set on two lines that slide against each other as the screen scrolls; the products stand in a
 * bloom of light inside a slowly turning ring of running stitch; petals and young leaves drift up past both
 * pictures at their own speeds. All of it is decoration (aria-hidden, still under reduced motion) and none
 * of it says anything: the copy is GIEO's, unchanged.
 */

// Loose petals and leaves: where each hangs in its box (%), its size (rem), turn (deg), kind, and how far it
// floats each way against the scroll (px; the runtime reads data-float).
export type Fleck = [x: number, y: number, size: number, turn: number, kind: 'petal' | 'deep' | 'cream' | 'leaf', float: number];
const AROUND_PRODUCTS: Fleck[] = [
  [4, 8, 1.1, -30, 'petal', 90],
  [88, 2, 0.8, 40, 'deep', 150],
  [97, 46, 1.3, 110, 'leaf', 70],
  [-3, 58, 0.9, 160, 'deep', 130],
  [20, 92, 1.4, 20, 'petal', 60],
  [70, 96, 0.9, -70, 'leaf', 110],
  [46, -4, 0.7, 75, 'cream', 170],
];
const AROUND_CLOTH: Fleck[] = [
  [92, 6, 1.2, 35, 'petal', 80],
  [6, -2, 0.8, -50, 'leaf', 140],
  [101, 62, 0.9, 130, 'deep', 110],
  [58, 98, 1.3, -15, 'petal', 60],
];

export function Flecks({ items }: { items: Fleck[] }) {
  return (
    <div aria-hidden="true" data-ornament className="pointer-events-none absolute inset-0">
      {items.map(([x, y, size, turn, kind, float], i) => (
        <span key={i} className="fleck-anchor" style={{ left: `${x}%`, top: `${y}%` }}>
          <span className="fleck" data-kind={kind} data-float={float} style={{ '--fleck': `${size}rem`, '--turn': `${turn}deg` } as CSSProperties} />
        </span>
      ))}
    </div>
  );
}

export async function Hands() {
  const t = await getTranslations('home.partner');
  const n = await getTranslations('home.nextGen');
  const credit = (await getTranslations('collections.hmong'))('credit');
  const [products, cloth] = listStills(HOME_STILLS);
  const next = n('body');
  const cut = next.indexOf('. ') + 1; // 0 when the paragraph is one sentence: then all of it is the lead column
  // The name on two lines (it breaks there by itself at this size): the first two words, then the rest.
  const words = t('name').split(' ');
  const lines = words.length > 3 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : [t('name')];

  return (
    <Section tone="paper" pad="none" id="partner" labelledBy="partner-title" thread="right" className="pt-section-sm pb-section-sm">
      <Container>
        <Grid className="items-start">
          <h2
            id="partner-title"
            lang="vi"
            className="relative z-1 col-span-full font-serif text-mega italic text-fg-heading lg:col-start-1 lg:col-end-10 lg:row-start-1"
          >
            {lines.map((line, i) => (
              // each line slides its own way as the screen scrolls (data-slide: % of its width, each way)
              <span key={line} data-slide={i % 2 ? -5 : 4} className={`block whitespace-nowrap ${i % 2 ? 'lg:pl-[0.9em]' : ''}`}>
                {line}
                {i < lines.length - 1 ? ' ' : ''}
              </span>
            ))}
          </h2>
          {products && (
            <div className="relative col-span-full -mr-gutter mt-2 ml-auto w-[92%] lg:col-start-7 lg:col-end-13 lg:row-start-1 lg:row-end-3 lg:mt-0 lg:ml-0 lg:w-auto">
              {/* light behind the products, and a ring of running stitch that turns as the screen scrolls */}
              <div aria-hidden="true" data-glow className="absolute -inset-[10%]" style={{ backgroundImage: 'var(--still-bloom)' }} />
              <svg aria-hidden="true" data-ornament viewBox="0 0 100 100" className="stitch-ring">
                <circle data-spin="50" cx="50" cy="50" r="48.5" />
                <circle data-spin="-80" cx="50" cy="50" r="41" />
              </svg>
              <Flecks items={AROUND_PRODUCTS} />
              <StillLife still={products} credit={credit} sizes="(min-width: 1024px) 50vw, 92vw" className="relative" creditClassName="mt-2 ml-[10%]" />
            </div>
          )}
          <Prose variant="lead" className="relative z-1 col-span-full mt-6 lg:col-start-1 lg:col-end-7 lg:row-start-2 lg:mt-8">
            {t('body')}
          </Prose>
          <ScrubClip
            name="thread"
            w={1280}
            h={722}
            ground="paper"
            className="col-span-full -mx-gutter my-4 aspect-[32/11]! w-[calc(100%+2*var(--gutter))] lg:row-start-3 lg:my-6 lg:aspect-[32/7]!"
          />

          {/* One column from 1024 (the cloth, the sprouts under it, beside the paragraph); under that its two
              pictures are grid items of their own, so the sprouts come after the paragraph. */}
          <div className="contents lg:col-start-1 lg:col-end-7 lg:row-start-4 lg:block">
            {cloth && (
              <div className="relative col-span-full -ml-gutter w-[calc(100%+var(--gutter))]">
                <div aria-hidden="true" data-glow className="absolute -inset-[6%]" style={{ backgroundImage: 'var(--still-bloom)' }} />
                <Flecks items={AROUND_CLOTH} />
                <StillLife still={cloth} credit={credit} index={1} sizes="(min-width: 1024px) 50vw, 100vw" className="relative" />
              </div>
            )}
            <ScrubClip
              name="sprout"
              w={720}
              h={720}
              ground="paper"
              // a round fade: on paper the clip's cream ground shows as a warm tint, which must not be a square
              className="order-1 col-span-full mt-4 ml-auto w-3/5 [mask-image:radial-gradient(closest-side,#000_80%,transparent)] lg:mt-0 lg:mr-[8%] lg:w-[52%]"
            />
          </div>
          <p id="next-gen" className="relative z-1 col-span-full mt-6 lg:col-start-7 lg:col-end-13 lg:row-start-4 lg:mt-0">
            {cut > 0 && (
              <span className="block font-serif text-quote text-balance italic text-fg-heading xl:text-[3.5rem]">{next.slice(0, cut)}</span>
            )}
            <span className="mt-6 block max-w-(--measure-lead) text-lead font-light text-fg-strong lg:mt-8">{next.slice(cut).trim()}</span>
          </p>
        </Grid>
      </Container>
    </Section>
  );
}
