import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import { Container, Grid, Hairline, Heading, Section } from '@/components/ui';
import { ArtLife } from './ArtLife';
import { still } from './art';

// Keys under about.departments.*; `teams` is the optional second line (GIEO's own wording).
const DEPARTMENTS: { key: string; teams?: string }[] = [
  { key: 'communityDev' },
  { key: 'productDev' },
  { key: 'businessDev' },
  { key: 'marketing', teams: 'marketingTeams' },
  { key: 'media', teams: 'mediaTeams' },
  { key: 'hr' },
];

/**
 * The departments as six stitched tiles, three across from 1024 (Maxwell, 2026-11-19: the page was too weak
 * and too spread out: a list six rows tall is now two). Each name is large; a team line sits under it where
 * GIEO gave one. The spools stand beside the heading. Not links: nothing here is interactive.
 */
export async function DepartmentList() {
  const t = await getTranslations('about');
  const credit = (await getTranslations('collections.noinep'))('credit');
  const spools = still('spools');

  return (
    <Section tone="cream" from="plum" pad="none" id="departments" labelledBy="departments-title" className="pt-section-sm pb-section-sm">
      <Container>
        <Grid className="items-end">
          <Heading id="departments-title" className="col-span-full lg:col-end-9">
            {t('departmentsHeading')}
          </Heading>
          {spools && (
            <ArtLife
              art={spools}
              credit={credit}
              sizes="(min-width: 1024px) 30vw, 90vw"
              className="col-span-full -mr-gutter ml-auto w-[90%] lg:col-start-9 lg:col-end-13 lg:-mb-2 lg:ml-0 lg:w-auto"
            />
          )}

          <ul role="list" className="col-span-full mt-6 grid grid-cols-1 gap-x-gap sm:grid-cols-2 lg:mt-10 lg:grid-cols-3">
            {DEPARTMENTS.map(({ key, teams }, i) => (
              <li key={key} data-enter className="slide-row">
                <Hairline />
                <div className="min-h-28 py-5 lg:min-h-44 lg:py-8">
                  <h3 className="font-serif text-quote text-balance italic text-fg-heading">
                    <span className="slide-up" style={{ '--i': i % 3 } as CSSProperties}>
                      <span>{t(`departments.${key}`)}</span>
                    </span>
                  </h3>
                  {teams && <p className="mt-2 text-body text-fg-body lg:text-lead">{t(`departments.${teams}`)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Grid>
      </Container>
    </Section>
  );
}
