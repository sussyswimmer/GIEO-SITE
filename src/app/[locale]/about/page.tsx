import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DictionaryCard } from '@/components/home/DictionaryCard';
import { Partner } from '@/components/home/Partner';
import { VisionMission } from '@/components/home/VisionMission';
import { PageHeader } from '@/components/layout/PageHeader';
import { DepartmentList } from '@/components/pages/DepartmentList';
import { Container, Grid, Heading, PillarCard, Prose, Section, Todo } from '@/components/ui';
import { routing } from '@/i18n/routing';
import { alternates } from '@/lib/seo';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return {
    title: t('title'),
    description: t('intro'),
    alternates: alternates(locale, '/about'),
  };
}

// Each pillar's placement at 1280 / 1920 (PLAN.md §3); below 1024 they stack. No explicit rows:
// auto-placement sets cards 1 and 2 side by side (2 dropped by mt-24), card 3 on the next row.
const PILLARS = [
  { key: 'economic', at: 'lg:col-start-1 lg:col-end-7 3xl:col-end-6' },
  { key: 'education', at: 'lg:col-start-7 lg:col-end-13 lg:mt-24 3xl:col-start-8' },
  { key: 'mentorship', at: 'lg:col-start-4 lg:col-end-10 lg:mt-16' },
] as const;

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const tp = await getTranslations('home.pillars');

  return (
    <>
      <PageHeader title={t('about.title')} intro={t('about.intro')} />

      <Section tone="paper" from="cream" pad="default" id="story" labelledBy="story-title">
        <Container>
          <Grid>
            <DictionaryCard
              headingId="story-title"
              word={t('home.meaning.word')}
              pos={t('home.meaning.pos')}
              pron={t('home.meaning.pron')}
              gloss={t('home.meaning.gloss')}
              body={t('home.meaning.body')}
              className="col-span-4 md:col-span-7 lg:col-span-6 lg:row-start-1"
            />
            <div className="col-span-4 mt-12 md:col-span-7 md:col-start-2 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:mt-0 lg:self-center">
              <Prose variant="lead">{t('home.craft.beat1')}</Prose>
              <p className="mt-6 text-caption text-ink-soft">{t('footer.supportedBy')}</p>
            </div>
          </Grid>
        </Container>
      </Section>

      <Section tone="cream" from="paper" pad="default" id="pillars" labelledBy="about-pillars-title">
        <Container>
          <Grid>
            <Heading id="about-pillars-title" className="col-span-4 max-w-(--measure-heading) md:col-span-6 lg:col-span-6">
              {tp('heading')}
            </Heading>
            <ul
              role="list"
              className="col-span-4 mt-12 flex flex-col gap-6 md:col-span-8 md:gap-8 lg:col-span-12 lg:mt-16 lg:grid lg:grid-cols-12 lg:gap-x-gap lg:gap-y-0"
            >
              {PILLARS.map(({ key, at }) => (
                <li key={key} className={at}>
                  <PillarCard title={tp(`${key}.title`)} body={tp(`${key}.body`)} />
                </li>
              ))}
            </ul>
          </Grid>
        </Container>
      </Section>

      <VisionMission />
      <DepartmentList />

      {/* TODO(team): about.teamHeading is empty, so nothing renders in production (no wrapper either). */}
      {!t('about.teamHeading') && process.env.NODE_ENV !== 'production' && (
        <Container>
          <Todo tag="team" block />
        </Container>
      )}

      <Partner heading={t('about.partnerHeading')} from="cream" />
    </>
  );
}
