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

/** The departments as large rows under running stitches (the home page's Involve rows, not links), still-lifes beside them. */
export async function DepartmentList() {
  const t = await getTranslations('about');
  const credit = (await getTranslations('collections.noinep'))('credit');
  const spools = still('spools');
  const cloth = still('cloth');

  return (
    <Section tone="cream" from="paper" pad="none" id="departments" labelledBy="departments-title" className="pt-section-sm pb-section-sm">
      <Container>
        <Grid className="items-center">
          <Heading id="departments-title" className="col-span-full">
            {t('departmentsHeading')}
          </Heading>

          <ul role="list" className="col-span-full mt-6 lg:col-end-9 lg:row-start-2 lg:mt-10">
            {DEPARTMENTS.map(({ key, teams }) => (
              <li key={key}>
                <Hairline />
                <div className="py-4 lg:py-5">
                  <h3 className="font-serif text-quote text-fg-heading">{t(`departments.${key}`)}</h3>
                  {teams && <p className="mt-1 text-body text-fg-body lg:text-lead">{t(`departments.${teams}`)}</p>}
                </div>
              </li>
            ))}
          </ul>

          {/* Thread at the head of the list, cloth at its foot (the cloth from 1024 only: a phone has the length already). */}
          <div className="col-span-full mt-6 flex flex-col justify-between gap-8 lg:col-start-8 lg:col-end-13 lg:row-start-2 lg:mt-10 lg:self-stretch">
            {spools && <ArtLife art={spools} credit={credit} sizes="(min-width: 1024px) 40vw, 90vw" className="-mr-gutter ml-auto w-[90%] lg:ml-0 lg:w-auto" />}
            {cloth && <ArtLife art={cloth} sizes="34vw" className="ml-auto w-4/5 max-lg:hidden" />}
          </div>
        </Grid>
      </Container>
    </Section>
  );
}
