import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageBand } from '@/components/pages/PageBand';
import { Showroom } from '@/components/pages/Showroom';
import { art, still } from '@/components/pages/art';
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

// The product pictures (docs/08 §2): the Blender portraits in public/art/products, made to sit on plum, or
// the weave film's key frame where one is not rendered. In the order the film makes them.
const PRODUCTS = [
  { key: 'tote', frame: 129 },
  { key: 'mug', frame: 149 },
  { key: 'coaster', frame: 169 },
] as const;

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
  const products = PRODUCTS.map(({ key, frame }) => {
    const photo = usable(hmong[key]);
    return {
      key,
      name: t(`home.craft.products.${key}`),
      render: art(`products/${key}`)?.src ?? `/film/weave/keys/s-${String(frame).padStart(4, '0')}.webp`,
      photo,
      alt: photo?.alt ?? '',
    };
  });
  const credit = t('collections.hmong.credit');

  return (
    <>
      <PageHeader
        title={t('collections.title')}
        intro={t('collections.intro')}
        art={art('pages/collections') ?? still('cloth')}
      />
      <Showroom
        name={t('collections.hmong.name')}
        body={t('collections.hmong.body')}
        credit={credit}
        cloth={still('cloth')}
        swatch={usable(hmong.brocade)}
        products={products}
        orderLabels={{ instagram: t('contact.instagramLabel'), email: t('contact.emailLabel') }}
      />
      <PageBand tone="paper" from="plum" items={products.map((p) => p.name)} />
    </>
  );
}
