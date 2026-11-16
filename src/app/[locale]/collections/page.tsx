import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { CollectionBlock } from '@/components/pages/CollectionBlock';
import { routing } from '@/i18n/routing';
import { collectionPhotos, type Photo } from '@/lib/photos';
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

export default async function CollectionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { hmong } = collectionPhotos;

  // A photo renders only with consent and its content key photos.<id>.alt (PLAN.md §5, §6).
  const usable = (p?: Photo) => {
    const key = `photos.${p?.id}.alt`;
    const alt = p?.consent && t.has(key) ? t(key) : '';
    return p && alt ? { ...p, alt } : undefined;
  };
  const product = (name: string, p?: Photo) => {
    const ok = usable(p);
    return { name, photo: ok, alt: ok?.alt ?? '' };
  };
  const swatch = usable(hmong.brocade);

  return (
    <>
      <PageHeader title={t('collections.title')} intro={t('collections.intro')} />
      <CollectionBlock
        id="hmong"
        tone="paper"
        from="cream"
        name={t('collections.hmong.name')}
        body={t('collections.hmong.body')}
        credit={t('collections.hmong.credit')}
        swatch={swatch}
        products={[
          product(t('home.craft.products.tote'), hmong.tote),
          product(t('home.craft.products.mug'), hmong.mug),
          product(t('home.craft.products.coaster'), hmong.coaster),
        ]}
        orderLabels={{ instagram: t('contact.instagramLabel'), email: t('contact.emailLabel') }}
      />
    </>
  );
}
