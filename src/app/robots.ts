import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Built once (the static export for GitHub Pages needs this said; the server build was static already).
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/qa', '/en/qa'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
