import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContactForm } from '@/components/pages/ContactForm';
import { ContactLinks } from '@/components/pages/ContactLinks';
import { PageBand } from '@/components/pages/PageBand';
import { Container, Grid, Section } from '@/components/ui';
import { routing } from '@/i18n/routing';
import { alternates } from '@/lib/seo';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  return {
    title: t('title'),
    description: t('intro'),
    alternates: alternates(locale, '/contact'),
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <>
      {/* No picture (Maxwell, 2026-11-19): the title, then straight to the ways in, which slide up into place. */}
      <PageHeader compact title={t('contact.title')} intro={t('contact.intro')} />

      <Section tone="paper" from="cream" pad="none" id="reach" className="pt-8 pb-6 lg:pt-12">
        <Container>
          <ContactLinks />
        </Container>
      </Section>

      {/* The three channels, sideways. */}
      <PageBand tone="paper" items={[t('contact.emailLabel'), t('contact.instagramLabel'), t('contact.facebookLabel')]} />

      <Section tone="cream" from="paper" pad="none" id="write" className="pt-section-sm pb-section-sm">
        <Container>
          <Grid>
            <div className="col-span-full md:col-span-7 lg:col-start-4 lg:col-end-10">
              <ContactForm
                siteName={t('meta.siteName')}
                labels={{
                  name: t('contact.form.name'),
                  email: t('contact.form.email'),
                  message: t('contact.form.message'),
                  submit: t('contact.form.submit'),
                  note: t('contact.form.note'),
                }}
              />
            </div>
          </Grid>
        </Container>
      </Section>
    </>
  );
}
