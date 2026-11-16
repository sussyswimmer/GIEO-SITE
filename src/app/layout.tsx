import type { ReactNode } from 'react';

// Required because src/app/not-found.tsx exists (next-intl's documented setup): without it the first 404
// outside a locale (a film manifest that is not rendered yet) fails to compile and takes the dev server down.
// <html> and <body> come from [locale]/layout.tsx and from not-found.tsx.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
