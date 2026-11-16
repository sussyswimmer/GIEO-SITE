import type { Metadata } from 'next';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

/**
 * Canonical + hreflang for one route. `href` is the locale-free path ('/', '/about').
 * With localePrefix 'as-needed': vi -> '/about', en -> '/en/about'.
 */
export function alternates(locale: string, href: string): Metadata['alternates'] {
  const path = (l: string) => getPathname({ locale: l, href });
  return {
    canonical: path(locale),
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, path(l)])),
      'x-default': path(routing.defaultLocale),
    },
  };
}
