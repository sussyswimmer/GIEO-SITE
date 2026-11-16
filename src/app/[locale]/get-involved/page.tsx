import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { InvolveSection } from '@/components/pages/InvolveSection';
import { ProgramList } from '@/components/pages/ProgramList';
import { ButtonLink, Container, Section, TextLink, Todo } from '@/components/ui';
import { routing } from '@/i18n/routing';
import { alternates } from '@/lib/seo';
import { EMAIL } from '@/lib/site';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'getInvolved' });
  return {
    title: t('title'),
    description: t('intro'),
    alternates: alternates(locale, '/get-involved'),
  };
}

export default async function GetInvolvedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  // Donate and volunteer have no body yet, so they render nothing here. There is no donate CTA;
  // partnering is the way in until GIEO answers (docs/00-open-questions.md #4).
  return (
    <>
      <PageHeader title={t('getInvolved.title')} intro={t('getInvolved.intro')} />

      <Section tone="paper" from="cream" pad="default" id="ways">
        <Container>
          <InvolveSection slug="shop" title={t('getInvolved.shop.title')} body={t('getInvolved.shop.body')}>
            <ButtonLink variant="secondary" href="/collections">
              {t('common.seeCollection')}
            </ButtonLink>
            <Todo tag="shop" />
          </InvolveSection>

          <InvolveSection slug="mentor" title={t('getInvolved.mentor.title')} body={t('getInvolved.mentor.body')}>
            <TextLink href={`mailto:${EMAIL}`} className="inline-flex min-h-11 items-center">{EMAIL}</TextLink>
            <Todo tag="mentor" />
          </InvolveSection>

          <InvolveSection slug="partner" title={t('getInvolved.partner.title')} body={t('getInvolved.partner.body')}>
            <TextLink href={`mailto:${EMAIL}`} className="inline-flex min-h-11 items-center">{EMAIL}</TextLink>
          </InvolveSection>

          <InvolveSection
            slug="volunteer"
            title={t('getInvolved.volunteer.title')}
            body={t('getInvolved.volunteer.body')}
          />

          <InvolveSection slug="donate" title={t('getInvolved.donate.title')} body={t('getInvolved.donate.body')} />
        </Container>
      </Section>

      <ProgramList />
    </>
  );
}
