import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
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
  experimental: { inlineCss: true },
  // public/ files have no hash, so rename a font file if its contents ever change.
  async headers() {
    return [{ source: '/fonts/:file', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }];
  },
};

export default withNextIntl(nextConfig);
