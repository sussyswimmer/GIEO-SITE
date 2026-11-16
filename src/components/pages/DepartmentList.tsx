import { getTranslations } from 'next-intl/server';
import { Container, Grid, Hairline, Heading, Section } from '@/components/ui';

// Keys under about.departments.*; `teams` is the optional second line (GIEO's own wording).
const DEPARTMENTS: { key: string; teams?: string }[] = [
  { key: 'communityDev' },
  { key: 'productDev' },
  { key: 'businessDev' },
  { key: 'marketing', teams: 'marketingTeams' },
  { key: 'media', teams: 'mediaTeams' },
  { key: 'hr' },
];

export async function DepartmentList() {
  const t = await getTranslations('about');

  return (
    <Section tone="cream" from="paper" pad="default" id="departments" labelledBy="departments-title">
      <Container>
        <Grid>
          <Heading id="departments-title" className="col-span-4 md:col-span-8 lg:col-span-8">
            {t('departmentsHeading')}
          </Heading>

          <ul
            role="list"
            className="col-span-4 mt-12 grid grid-cols-1 gap-y-8 md:col-span-8 md:grid-cols-2 md:gap-x-gap md:gap-y-12 lg:col-span-12 lg:mt-16 lg:grid-cols-3 lg:gap-y-12"
          >
            {DEPARTMENTS.map(({ key, teams }) => (
              <li key={key}>
                <Hairline />
                <h3 className="pt-6 font-serif text-h4 font-medium text-plum-ink">{t(`departments.${key}`)}</h3>
                {teams && <p className="mt-2 text-caption text-ink-soft">{t(`departments.${teams}`)}</p>}
              </li>
            ))}
          </ul>
        </Grid>
      </Container>
    </Section>
  );
}
