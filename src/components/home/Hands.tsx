import { getTranslations } from 'next-intl/server';
import { Container, Grid, PhotoFrame, Prose, ScrubClip, Section } from '@/components/ui';
import { photo } from '@/lib/photos';

/**
 * S2 Hands: who makes the products, and who the work is for (the old Partner and NextGen sections).
 * First screen: the partner's name very large, the partner paragraph under it, and beside the two (under
 * the name on a phone) GIEO's own photographs of the two products (docs/09 F3): the bag, and the lipstick
 * holder as a smaller second frame, each labelled with its name and kind, one partner credit under both.
 * The name is two balanced lines and stays inside seven columns, clear of the photographs. A strip of thread
 * unwinds across the page between the two screens: it is their divider.
 * Second screen: a photograph of cloth on the loom beside the paragraph on the next generation, whose first
 * sentence is set large in italic (the same paragraph, cut at its first full stop: no word is added or
 * moved), and under the photograph a dish of sprouts that grows as it is scrolled past. The block reads
 * complete without the photographs.
 */
export async function Hands() {
  const t = await getTranslations('home.partner');
  const n = await getTranslations('home.nextGen');
  const tAll = await getTranslations();
  const credit = tAll('collections.noinep.credit');
  const label = (key: 'bag' | 'lipstick') => `${tAll(`home.craft.products.${key}.name`)} · ${tAll(`home.craft.products.${key}.kind`)}`;
  const bag = photo('bag-pink', tAll);
  const holder = photo('lipstick-on-bag', tAll);
  const cloth = photo('loom-cloth', tAll);
  const next = n('body');
  const cut = next.indexOf('. ') + 1; // 0 when the paragraph is one sentence: then all of it is the lead column

  return (
    <Section tone="paper" pad="none" id="partner" labelledBy="partner-title" thread="right" className="pt-section-sm pb-section-sm">
      <Container>
        <Grid className="items-start">
          <h2
            id="partner-title"
            lang="vi"
            className="relative z-1 col-span-full font-serif text-mega italic text-fg-heading lg:col-start-1 lg:col-end-8 lg:row-start-1"
          >
            {t('name')}
          </h2>
          {(bag || holder) && (
            // one figure for the two frames: its caption is the partner credit, as under every product picture
            <figure className="col-span-full mt-6 lg:col-start-8 lg:col-end-13 lg:row-start-1 lg:row-end-3 lg:mt-4">
              <PhotoFrame photo={bag} ratio="16 / 9" sizes="(min-width: 1024px) 40vw, 92vw" caption={label('bag')} />
              <PhotoFrame
                photo={holder}
                ratio="3 / 2"
                sizes="(min-width: 1024px) 24vw, 70vw"
                caption={label('lipstick')}
                className="mt-4 ml-auto w-3/4 lg:mt-6 lg:w-3/5"
              />
              <figcaption className="mt-4 text-caption text-fg-body">{credit}</figcaption>
            </figure>
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
            <PhotoFrame photo={cloth} ratio="4 / 5" sizes="(min-width: 1024px) 40vw, 92vw" className="col-span-full lg:w-5/6" />
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
              <span className="block font-serif text-quote text-balance italic text-fg-heading xl:text-[3rem]">{next.slice(0, cut)}</span>
            )}
            <span className="mt-6 block max-w-(--measure-lead) text-lead font-light text-fg-strong lg:mt-8">{next.slice(cut).trim()}</span>
          </p>
        </Grid>
      </Container>
    </Section>
  );
}
