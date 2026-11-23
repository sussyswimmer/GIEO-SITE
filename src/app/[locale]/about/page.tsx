import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { KineticBand } from '@/components/home/KineticBand';
import { VisionMission } from '@/components/home/VisionMission';
import { Involve } from '@/components/home/Involve';
import { AboutHero } from '@/components/pages/AboutHero';
import { ArtLife } from '@/components/pages/ArtLife';
import { DepartmentList } from '@/components/pages/DepartmentList';
import { DictionaryEntry } from '@/components/pages/DictionaryEntry';
import { PartnerBlock } from '@/components/pages/PartnerBlock';
import { art, still } from '@/components/pages/art';
import type { CSSProperties } from 'react';
import { Container, Grid, Hairline, Heading, Prose, Section, Todo } from '@/components/ui';
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
      {/* Redone (Maxwell, 2026-11-19: "too weak"): the name itself is the first screen, on plum. */}
      <AboutHero title={t('about.title')} name={t('home.hero.eyebrow')} intro={t('about.intro')} art={art('pages/about') ?? still('sprouts')} />

      {/* The word, set large, with what GIEO does beside it. */}
      <Section tone="paper" from="plum" pad="none" id="story" labelledBy="story-title" className="pt-section-sm pb-section-sm">
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

      {/* The three pillars as three full-width rows: the title very large, sliding up from under its stitch
          as the row is reached, its paragraph beside it. The band below runs the titles sideways. */}
      <Section tone="cream" from="paper" glow="blush" pad="none" id="about-pillars" labelledBy="about-pillars-title" className="pt-section-sm pb-6">
        <Container>
          <Grid className="items-end">
            <Heading id="about-pillars-title" className="col-span-full lg:col-end-9">
              {tp('heading')}
            </Heading>
            {buds && <ArtLife art={buds} sizes="(min-width: 1024px) 14vw, 30vw" className="col-span-full ml-auto w-1/4 max-lg:hidden lg:col-start-11 lg:col-end-13 lg:-mb-10 lg:w-auto" />}
          </Grid>
          <ul role="list" className="mt-6 lg:mt-10">
            {PILLARS.map((key, i) => (
              <li key={key} data-enter className="slide-row">
                <Hairline />
                <Grid className="items-start py-6 lg:py-10">
                  <h3 className="col-span-full font-serif text-[clamp(2.25rem,5.4vw,5.25rem)] leading-[1.02] tracking-(--ls-heading) text-balance italic text-fg-heading lg:col-end-7">
                    <span className="slide-up" style={{ '--i': i } as CSSProperties}>
                      <span>{tp(`${key}.title`)}</span>
                    </span>
                  </h3>
                  <p className="col-span-full mt-4 text-lead font-light text-fg-strong lg:col-start-7 lg:col-end-13 lg:mt-3">{tp(`${key}.body`)}</p>
                </Grid>
              </li>
            ))}
          </ul>
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

      {/* The three ways in, then the partner who makes the products. */}
      <Involve />
      <PartnerBlock heading={t('about.partnerHeading')} from="paper" />
    </>
  );
}
