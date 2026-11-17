import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// GIEO_STATIC=1 (scripts/build-pages.mjs): a static export for GitHub Pages, served under /<repo>/. No server
// there, so no middleware, no on-demand OG image and no headers(); the build script handles the first two.
const pages = process.env.GIEO_STATIC === '1';
const basePath = pages ? process.env.GIEO_BASE_PATH || '/GIEO-SITE' : '';

const nextConfig: NextConfig = {
  ...(pages ? { output: 'export' as const, basePath, trailingSlash: true, images: { unoptimized: true } } : {}),
  // GIEO_DIST lets two builds run side by side (a review server and a worker's) without sharing .next.
  distDir: process.env.GIEO_DIST || '.next',
  // Stops Next picking a parent folder (a stray C:\Users\maxwe\pnpm-lock.yaml) as the workspace root.
  outputFileTracingRoot: process.cwd(),
  // The OG card renders on demand and reads these at runtime via process.cwd(), which the
  // tracer cannot follow; without this the deployed route has no tokens or fonts.
  outputFileTracingIncludes: {
    '/*/opengraph-image/*': [
      './src/styles/tokens.css',
      './node_modules/@fontsource/playfair-display/files/playfair-display-{latin,vietnamese}-400-normal.woff',
    ],
  },
  // Not in the static build: its script prefixes public paths in the output, and inlined CSS travels in a
  // length-counted block of the page data, which any edit corrupts (the pages then render blank).
  experimental: pages ? {} : { inlineCss: true },
  // public/ files have no hash, so rename a font file if its contents ever change.
  ...(pages
    ? {}
    : {
        async headers() {
          return [{ source: '/fonts/:file', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }];
        },
      }),
};

export default withNextIntl(nextConfig);
