import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { ArtLife } from '@/components/pages/ArtLife';
import { ContactForm } from '@/components/pages/ContactForm';
import { ContactLinks } from '@/components/pages/ContactLinks';
import { PageBand } from '@/components/pages/PageBand';
import { art, still } from '@/components/pages/art';
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
  const picture = art('objects/knot') ?? still('spools');

  return (
    <>
      <PageHeader title={t('contact.title')} intro={t('contact.intro')} art={art('pages/contact') ?? still('cloth')} />

      <Section tone="paper" from="cream" pad="none" id="reach" className="pt-section-sm pb-6">
        <Container>
          <ContactLinks />
        </Container>
      </Section>

      {/* The three channels, sideways. */}
      <PageBand tone="paper" items={[t('contact.emailLabel'), t('contact.instagramLabel'), t('contact.facebookLabel')]} />

      <Section tone="cream" from="paper" pad="none" id="write" className="pt-section-sm pb-section-sm">
        <Container>
          <Grid className="items-center">
            {picture && (
              <ArtLife
                art={picture}
                sizes="(min-width: 1024px) 45vw, 70vw"
                className="col-span-full w-[70%] md:w-1/2 lg:col-start-1 lg:col-end-7 lg:w-auto"
              />
            )}
            <div className="col-span-full mt-6 md:col-span-7 lg:col-start-7 lg:col-end-13 lg:mt-0">
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
