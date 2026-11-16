import { getTranslations } from 'next-intl/server';
import { Container, Grid, Hairline, Heading, Section } from '@/components/ui';

// Keys under getInvolved.programs.*, in the order the content owner gave them.
const PROGRAMS = [
  'trips',
  'scholarships',
  'hygiene',
  'donations',
  'career',
  'financialLiteracy',
  'english',
  'buddy',
] as const;

/** Things GIEO is building, never results (the note under the heading says so). */
export async function ProgramList() {
  const t = await getTranslations('getInvolved');

  return (
    <Section tone="cream" from="paper" pad="default" id="programs" labelledBy="programs-title">
      <Container>
        <Grid>
          <div className="col-span-4 md:col-span-8 lg:col-span-8">
            <Heading id="programs-title">{t('programsHeading')}</Heading>
            <p className="mt-4 text-caption text-ink-soft">{t('programsNote')}</p>
          </div>

          <ul
            role="list"
            className="col-span-4 mt-12 grid grid-cols-1 md:col-span-8 md:grid-cols-2 md:gap-x-gap lg:col-start-1 lg:col-end-13 lg:mt-16 3xl:col-end-11"
          >
            {PROGRAMS.map((key) => (
              <li key={key} className="text-body text-ink">
                <Hairline />
                <span className="block py-4 text-pretty">{t(`programs.${key}`)}</span>
              </li>
            ))}
          </ul>
        </Grid>
      </Container>
    </Section>
  );
}
