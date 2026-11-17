import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { InvolveSection } from '@/components/pages/InvolveSection';
import { PageBand } from '@/components/pages/PageBand';
import { ProgramList } from '@/components/pages/ProgramList';
import { art, still } from '@/components/pages/art';
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

// The address is the action on these rows, so it is set like the links on the contact page.
const MAIL = 'inline-flex min-h-11 items-center font-serif text-h3 italic [overflow-wrap:anywhere]';
// Prefers to break before the "@"; a span, because each child of the inline-flex link would be its own flex item.
const [MAIL_USER, MAIL_HOST] = EMAIL.split('@');
const MAIL_TEXT = (
  <span>
    {MAIL_USER}
    <wbr />@{MAIL_HOST}
  </span>
);

export default async function GetInvolvedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  // Donate and volunteer have no body yet, so they render nothing here. There is no donate CTA;
  // partnering is the way in until GIEO answers (docs/00-open-questions.md #4).
  return (
    <>
      <PageHeader title={t('getInvolved.title')} intro={t('getInvolved.intro')} art={art('pages/get-involved') ?? still('lotus-seeds')} />

      <Section tone="paper" from="cream" pad="none" id="ways" className="pt-section-sm">
        <Container>
          <InvolveSection slug="shop" title={t('getInvolved.shop.title')} body={t('getInvolved.shop.body')}>
            <ButtonLink variant="secondary" href="/collections">
              {t('common.seeCollection')}
            </ButtonLink>
            <Todo tag="shop" />
          </InvolveSection>

          <InvolveSection slug="mentor" title={t('getInvolved.mentor.title')} body={t('getInvolved.mentor.body')}>
            <TextLink href={`mailto:${EMAIL}`} className={MAIL}>{MAIL_TEXT}</TextLink>
            <Todo tag="mentor" />
          </InvolveSection>

          <InvolveSection slug="partner" title={t('getInvolved.partner.title')} body={t('getInvolved.partner.body')}>
            <TextLink href={`mailto:${EMAIL}`} className={MAIL}>{MAIL_TEXT}</TextLink>
          </InvolveSection>

          <InvolveSection
            slug="volunteer"
            title={t('getInvolved.volunteer.title')}
            body={t('getInvolved.volunteer.body')}
          />

          <InvolveSection slug="donate" title={t('getInvolved.donate.title')} body={t('getInvolved.donate.body')} />
        </Container>
      </Section>

      {/* The three ways that have copy, sideways. */}
      <PageBand tone="paper" items={[t('getInvolved.shop.title'), t('getInvolved.mentor.title'), t('getInvolved.partner.title')]} />

      <ProgramList />
    </>
  );
}
