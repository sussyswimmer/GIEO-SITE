import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['vi', 'en'],
  defaultLocale: 'vi',
  localePrefix: 'as-needed',
  alternateLinks: false,
  // TODO(lang): GIEO hasn't confirmed the default language; browser detection with VI fallback
});
