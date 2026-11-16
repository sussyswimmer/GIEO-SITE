import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContactForm } from '@/components/pages/ContactForm';
import { ContactLinks } from '@/components/pages/ContactLinks';
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
      <PageHeader title={t('contact.title')} intro={t('contact.intro')} />

      <Section tone="paper" from="cream" pad="default" id="write">
        <Container>
          <Grid>
            <div className="col-span-4 md:col-span-8 lg:col-span-5 lg:row-start-1">
              <ContactLinks />
            </div>
            <div className="col-span-4 mt-16 md:col-span-7 lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:mt-0 3xl:col-span-5">
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
