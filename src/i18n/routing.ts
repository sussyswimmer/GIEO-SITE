import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['vi', 'en'],
  defaultLocale: 'vi',
  // The static build (GitHub Pages) has no middleware to rewrite /about to /vi/about, so every locale is in the URL.
  localePrefix: process.env.NEXT_PUBLIC_GIEO_STATIC === '1' ? 'always' : 'as-needed',
  alternateLinks: false,
  // TODO(lang): GIEO hasn't confirmed the default language; browser detection with VI fallback
});
