import { getTranslations } from 'next-intl/server';
import { Container, Grid, Hairline, Heading, Section } from '@/components/ui';
import { ArtLife } from './ArtLife';
import { art, still } from './art';

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

/** Things GIEO is building, never results (the note under the heading says so): two stitched columns beside a still-life. */
export async function ProgramList() {
  const t = await getTranslations('getInvolved');
  const picture = art('objects/books') ?? still('sprouts');

  return (
    <Section tone="cream" from="paper" pad="none" id="programs" labelledBy="programs-title" className="pt-8 pb-section-sm lg:pt-10">
      <Container>
        <Grid className="items-start">
          <div className="relative z-1 col-span-full lg:col-end-9">
            <Heading id="programs-title">{t('programsHeading')}</Heading>
            <p className="mt-4 max-w-(--measure) text-body text-fg-strong lg:mt-6">{t('programsNote')}</p>
          </div>

          {picture && (
            <ArtLife
              art={picture}
              sizes="(min-width: 1024px) 34vw, 60vw"
              className="col-span-full mt-6 ml-auto w-3/5 md:w-2/5 lg:col-start-9 lg:col-end-13 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:w-auto lg:self-center"
            />
          )}

          <ul role="list" className="col-span-full mt-6 grid grid-cols-1 md:grid-cols-2 md:gap-x-gap lg:col-end-9 lg:mt-10">
            {PROGRAMS.map((key) => (
              <li key={key} className="text-lead font-light text-fg-strong">
                <Hairline />
                <span className="block py-4 text-pretty lg:py-5">{t(`programs.${key}`)}</span>
              </li>
            ))}
          </ul>
        </Grid>
      </Container>
    </Section>
  );
}
