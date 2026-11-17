import type { MetadataRoute } from 'next';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { NAV_LINKS, SITE_URL } from '@/lib/site';

// Built once (the static export for GitHub Pages needs this said; the server build was static already).
export const dynamic = 'force-static';

// Every public route in every locale. /qa is excluded (robots.ts disallows it too).
const ROUTES = ['/', ...NAV_LINKS.map((l) => l.href)];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.flatMap((href) => {
    const abs = (locale: string) => `${SITE_URL}${getPathname({ locale, href })}`;
    const languages = Object.fromEntries([
      ...routing.locales.map((l) => [l, abs(l)]),
      ['x-default', abs(routing.defaultLocale)],
    ]);
    return routing.locales.map((locale) => ({
      url: abs(locale),
      alternates: { languages },
    }));
  });
}
