import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ItalicFaces } from '@/components/layout/PageHeader';
import { AsMade } from '@/components/pages/AsMade';
import { PageBand } from '@/components/pages/PageBand';
import { ParallaxHero } from '@/components/pages/ParallaxHero';
import { Showroom } from '@/components/pages/Showroom';
import { art, still } from '@/components/pages/art';
import { routing } from '@/i18n/routing';
import { alternates } from '@/lib/seo';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'collections' });
  return {
    title: t('title'),
    description: t('intro'),
    alternates: alternates(locale, '/collections'),
  };
}

// The product pictures (docs/08 §2): the Blender portraits in public/art/products (blender/film/art.py), made
// to sit on plum. In the order the film makes them. GIEO's own photos of the products are not put in the
// gallery: they come after it, as prints (AsMade).
const PRODUCTS = ['bag', 'lipstick'] as const;

export default async function CollectionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const products = PRODUCTS.map((key) => ({
    key,
    name: t(`home.craft.products.${key}.name`),
    kind: t(`home.craft.products.${key}.kind`),
    render: art(`products/${key}`)?.src,
    alt: '',
  }));
  const credit = t('collections.noinep.credit');

  return (
    <>
      <ItalicFaces />
      <ParallaxHero title={t('collections.title')} intro={t('collections.intro')} />
      <Showroom
        name={t('collections.noinep.name')}
        tagline={t('collections.noinep.tagline')}
        body={t('collections.noinep.body')}
        credit={credit}
        cloth={still('cloth')}
        products={products}
        orderLabels={{ instagram: t('contact.instagramLabel'), email: t('contact.emailLabel') }}
      />
      <AsMade />
      <PageBand tone="paper" from="plum" items={products.map((p) => p.name)} />
    </>
  );
}
