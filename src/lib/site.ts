// Contact details and routes are facts, not copy: they live here, not in src/content/*.json.
// Values from CLAUDE.md "Quick facts" and docs/01-brand.md §1.

export const EMAIL = 'gieovietnam2026@gmail.com';
export const INSTAGRAM_URL = 'https://www.instagram.com/gieo.vietnam';
export const INSTAGRAM_HANDLE = '@gieo.vietnam';
export const FACEBOOK_URL = 'https://www.facebook.com/gieo.vietnam';
export const FACEBOOK_LABEL = 'facebook.com/gieo.vietnam';

// TODO(domain): set NEXT_PUBLIC_SITE_URL once GIEO picks a domain. Until then: Vercel's
// production URL on Vercel builds (00-open-questions.md #9), otherwise localhost.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

/** Primary navigation, in order. `key` is the label under `nav.*`; Home is the logo. */
export const NAV_LINKS = [
  { key: 'collections', href: '/collections' },
  { key: 'about', href: '/about' },
  { key: 'getInvolved', href: '/get-involved' },
  { key: 'contact', href: '/contact' },
] as const;
