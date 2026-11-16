import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { preload } from 'react-dom';
import { Footer } from '@/components/layout/Footer';
import { LateFonts } from '@/components/layout/LateFonts';
import { LoadHairline } from '@/components/layout/LoadHairline';
import { NavPill } from '@/components/layout/NavPill';
import { MotionBoot } from '@/components/motion/MotionBoot';
import { SkipLink } from '@/components/layout/SkipLink';
import { routing } from '@/i18n/routing';
import { alternates } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';
import '../globals.css';

type Props = Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t('title'), template: `%s · ${t('siteName')}` },
    description: t('description'),
    alternates: alternates(locale, '/'), // inner pages override with their own path
    icons: { icon: 'data:,' }, // TODO(logo-svg): GIEO's mark goes here; never a drawn or typeset stand-in
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Client components take strings as props and the provider gets no messages (it only carries the
  // locale for navigation), which keeps next-intl's ICU message parser out of the first-load JS.
  const { nav, meta } = await getMessages();

  // Only the hero face is preloaded (05-build-plan Phase 0): "GIEO" is unaccented, so latin is enough.
  preload('/fonts/playfair-display-latin-400-normal.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={null}>
          <LateFonts />
          <SkipLink />
          <NavPill nav={nav as Record<string, string>} siteName={(meta as Record<string, string>).siteName} />
          <LoadHairline />
          <MotionBoot />
          {/* relative, with no z-index: the home page's thread is positioned against it (DESIGN.md §1) */}
          <main id="main" className="relative">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
