import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { KineticBand } from '@/components/home/KineticBand';
import { VisionMission } from '@/components/home/VisionMission';
import { PageHeader } from '@/components/layout/PageHeader';
import { ArtLife } from '@/components/pages/ArtLife';
import { DepartmentList } from '@/components/pages/DepartmentList';
import { DictionaryEntry } from '@/components/pages/DictionaryEntry';
import { PartnerBlock } from '@/components/pages/PartnerBlock';
import { art, still } from '@/components/pages/art';
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

const PILLARS = ['economic', 'education', 'mentorship'] as const;

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const tp = await getTranslations('home.pillars');
  const seeds = still('lotus-seeds');
  const buds = art('objects/buds');

  return (
    <>
      <PageHeader title={t('about.title')} intro={t('about.intro')} art={art('pages/about') ?? still('sprouts')} />

      {/* The word, set large, with what GIEO does beside it. */}
      <Section tone="paper" from="cream" pad="none" id="story" labelledBy="story-title" className="pt-section-sm pb-section-sm">
        <Container>
          <Grid className="items-start">
            <DictionaryEntry
              headingId="story-title"
              word={t('home.meaning.word')}
              pos={t('home.meaning.pos')}
              pron={t('home.meaning.pron')}
              gloss={t('home.meaning.gloss')}
              body={t('home.meaning.body')}
              className="relative z-1 col-span-full lg:col-end-8"
            />
            <div className="col-span-full mt-8 lg:col-start-8 lg:col-end-13 lg:mt-0">
              {seeds && (
                <ArtLife art={seeds} sizes="(min-width: 1024px) 40vw, 80vw" className="-mr-gutter ml-auto w-4/5 lg:-mt-8 lg:w-auto" />
              )}
              <Prose variant="lead" className="relative z-1 mt-4 lg:-mt-6">
                {t('home.craft.beat1')}
              </Prose>
              <small className="mt-4 block text-caption text-fg-body">{t('footer.supportedBy')}</small>
            </div>
          </Grid>
        </Container>
      </Section>

      {/* Three wide cards beside the heading; the band below runs their titles sideways, as on the home page. */}
      <Section tone="cream" from="paper" glow="blush" pad="none" id="about-pillars" labelledBy="about-pillars-title" className="pt-section-sm pb-6">
        <Container>
          <Grid className="items-start">
            <div className="col-span-full lg:col-end-6">
              <Heading id="about-pillars-title" className="max-w-(--measure-heading)">
                {tp('heading')}
              </Heading>
              {buds && (
                <ArtLife art={buds} sizes="(min-width: 1024px) 22vw, 40vw" className="mt-2 ml-auto w-2/5 max-lg:hidden lg:mx-auto lg:mt-8 lg:w-1/2" />
              )}
            </div>
            <ul role="list" className="col-span-full mt-6 flex flex-col gap-4 lg:col-start-6 lg:col-end-13 lg:mt-4 lg:gap-6">
              {PILLARS.map((key) => (
                <li key={key}>
                  <PillarCard title={tp(`${key}.title`)} body={tp(`${key}.body`)} />
                </li>
              ))}
            </ul>
          </Grid>
        </Container>
      </Section>
      <KineticBand />

      <VisionMission />
      <DepartmentList />

      {/* TODO(team): about.teamHeading is empty, so nothing renders in production (no wrapper either). */}
      {!t('about.teamHeading') && process.env.NODE_ENV !== 'production' && (
        <Container>
          <Todo tag="team" block />
        </Container>
      )}

      <PartnerBlock heading={t('about.partnerHeading')} from="cream" />
    </>
  );
}
