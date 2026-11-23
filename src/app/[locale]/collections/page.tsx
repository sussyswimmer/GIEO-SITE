import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { CollectionBlock } from '@/components/pages/CollectionBlock';
import { PageBand } from '@/components/pages/PageBand';
import { art, still } from '@/components/pages/art';
import { routing } from '@/i18n/routing';
import { photo } from '@/lib/photos';
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

// The Nối Nếp collection's two products, each with GIEO's own photograph of it (docs/09 F2, F3).
const PRODUCTS = [
  { key: 'bag', photo: 'bag-rows' },
  { key: 'lipstick', photo: 'lipstick-rows' },
] as const;

export default async function CollectionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  // A photo renders only with consent and its content key photos.<id>.alt (PLAN.md §5, §6).
  const products = PRODUCTS.map(({ key, photo: id }) => ({
    name: t(`home.craft.products.${key}.name`),
    kind: t(`home.craft.products.${key}.kind`),
    photo: photo(id, t),
  }));
  const credit = t('collections.noinep.credit');

  return (
    <>
      <PageHeader
        title={t('collections.title')}
        intro={t('collections.intro')}
        art={art('pages/collections') ?? still('cloth')}
      />
      <CollectionBlock
        id="noinep"
        tone="paper"
        from="cream"
        name={t('collections.noinep.name')}
        tagline={t('collections.noinep.tagline')}
        body={t('collections.noinep.body')}
        credit={credit}
        swatch={photo('nep-cloth', t)}
        art={art('objects/basket')}
        products={products}
        orderLabels={{ instagram: t('contact.instagramLabel'), email: t('contact.emailLabel') }}
      />
      <PageBand tone="paper" items={products.map((p) => p.name)} />
    </>
  );
}
